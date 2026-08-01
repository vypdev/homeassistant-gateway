import re
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from starlette.staticfiles import StaticFiles

from homeassistant_gateway.application.audit import (
    AuditEvent,
    AuditReader,
    AuditSink,
    NoopAuditSink,
)
from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.clients import (
    IssueClient,
    ListClients,
    RevokeClient,
    RotateClient,
)
from homeassistant_gateway.application.development import (
    DevelopmentReportStore,
    DevelopmentResult,
    DevelopmentToolRunner,
    build_development_report,
    development_catalog,
    development_packs,
)
from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.application.operator_preview import build_operator_preview
from homeassistant_gateway.domain.clients import Client
from homeassistant_gateway.domain.policy import Decision, Profile
from homeassistant_gateway.presentation.ui import UI_DIST, index_response


class HealthResponse(BaseModel):
    status: str


class ReadinessResponse(BaseModel):
    status: str
    storage: str
    mcp: str
    home_assistant: str


class CreateClientRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=256)
    profile: Profile
    capabilities: frozenset[str] = Field(default_factory=frozenset)


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    display_name: str
    profile: Profile
    capabilities: frozenset[str]
    created_at: datetime
    status: str
    revoked_at: datetime | None

    @classmethod
    def from_domain(cls, client: Client) -> "ClientResponse":
        return cls(
            client_id=client.client_id,
            display_name=client.display_name,
            profile=client.profile,
            capabilities=client.capabilities,
            created_at=client.created_at,
            status=client.status.value,
            revoked_at=client.revoked_at,
        )


class IssuedClientResponse(ClientResponse):
    token: str


class EvaluatePolicyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: str = Field(min_length=1, max_length=128)
    capability: str = Field(min_length=1, max_length=128)
    mutation: bool = False


class PolicyDecisionResponse(BaseModel):
    decision: Decision
    reason: str


class AuditEventResponse(BaseModel):
    event_id: str
    occurred_at: datetime
    request_id: str
    remote_user_id: str | None
    action: str
    target: str
    decision: str
    outcome: str
    status_code: int

    @classmethod
    def from_domain(cls, event: AuditEvent) -> "AuditEventResponse":
        return cls.model_validate(event, from_attributes=True)




class DevelopmentOperationResponse(BaseModel):
    name: str
    label: str
    description: str
    kind: str
    supports_entity_id: bool
    supports_start_time: bool


class DevelopmentRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operation: str = Field(min_length=1, max_length=64)
    parameters: dict[str, str] = Field(default_factory=dict)


class OperatorPreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operation: str = Field(min_length=1, max_length=128)
    target: str = Field(min_length=1, max_length=256)
    capability: str = Field(min_length=1, max_length=128)
    proposed: dict[str, Any] = Field(default_factory=dict)
    current: dict[str, Any] = Field(default_factory=dict)


class DevelopmentResultResponse(BaseModel):
    status: str
    operation: str
    duration_ms: int
    count: int
    data: Any = None
    reason: str | None = None

class MCPDiscoveryResponse(BaseModel):
    server_name: str
    transport: str
    endpoint: str
    client_id: str
    profile: Profile
    capabilities: frozenset[str]
    tools: tuple[str, ...]


def parse_bearer_token(header: str | None) -> str | None:
    if not header:
        return None
    scheme, separator, credentials = header.partition(" ")
    if scheme.lower() != "bearer" or not separator or not credentials:
        return None
    if credentials != credentials.strip() or " " in credentials:
        return None
    return credentials


def create_app(
    issue_client: IssueClient,
    list_clients: ListClients,
    revoke_client: RevokeClient,
    rotate_client: RotateClient,
    authenticate_client: AuthenticateClient,
    authorize_request: AuthorizeRequest,
    audit_sink: AuditSink | None = None,
    audit_reader: AuditReader | None = None,
    mcp_app: Any | None = None,
    home_assistant: HomeAssistantReadPort | None = None,
    development_runner: DevelopmentToolRunner | None = None,
    development_report_store: DevelopmentReportStore | None = None,
    development_console_enabled: bool = True,
    lifespan: Any | None = None,
) -> FastAPI:
    """Build the HTTP adapter around already-wired application use cases."""
    app = FastAPI(title="Home Assistant Gateway", version="0.2.0", lifespan=lifespan)
    sink = audit_sink or NoopAuditSink()

    def previous_development_report() -> Any | None:
        if development_report_store is None:
            return None
        reports = development_report_store.list(1)
        return reports[0] if reports else None
    if UI_DIST.is_dir():
        app.mount("/assets", StaticFiles(directory=UI_DIST / "assets"), name="assets")

    def record_audit(request: Request, response: Response, decision: str, outcome: str) -> None:
        sink.record(
            AuditEvent(
                event_id=uuid.uuid4().hex,
                occurred_at=datetime.now(UTC),
                request_id=request.state.request_id,
                remote_user_id=getattr(request.state, "remote_user_id", None),
                action=f"http.{request.method.lower()}",
                target=request.url.path,
                decision=decision,
                outcome=outcome,
                status_code=response.status_code,
            )
        )

    @app.middleware("http")
    async def require_ingress_identity(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        candidate_request_id = request.headers.get("x-request-id", "")
        request_id = (
            candidate_request_id
            if re.fullmatch(r"[A-Za-z0-9._-]{1,64}", candidate_request_id)
            else uuid.uuid4().hex
        )
        request.state.request_id = request_id

        if request.url.path not in {"/health", "/ready"}:
            remote_user_id = request.headers.get("x-remote-user-id")
            if not remote_user_id:
                response = JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "ingress_identity_required"},
                )
                response.headers["X-Request-ID"] = request_id
                record_audit(request, response, "denied", "rejected")
                return response
            request.state.remote_user_id = remote_user_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'"
        record_audit(
            request,
            response,
            "allowed" if response.status_code < 400 else "denied",
            "success" if response.status_code < 400 else "error",
        )
        return response

    @app.get("/", response_class=Response, include_in_schema=False)
    def index() -> Response:
        return index_response()

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.get("/ready", response_model=ReadinessResponse)
    def readiness() -> ReadinessResponse:
        upstream = "disabled" if home_assistant is None else ("ready" if home_assistant.health() else "unavailable")
        return ReadinessResponse(
            status="ready" if upstream != "unavailable" else "degraded",
            storage="ready",
            mcp="ready" if mcp_app is not None else "disabled",
            home_assistant=upstream,
        )

    @app.get("/api/development/catalog")
    def development_catalog_resource() -> dict[str, Any]:
        upstream = "disabled" if home_assistant is None else ("ready" if home_assistant.health() else "unavailable")
        return {
            "enabled": development_console_enabled,
            "upstream": upstream,
            "operations": [asdict(item) for item in development_catalog()],
            "packs": [asdict(item) for item in development_packs()],
            "mutations": {
                "status": "disabled",
                "reason": "operator_mutations_not_implemented",
                "approval_required": True,
            },
        }

    @app.post("/api/development/run")
    def development_run_resource(request: DevelopmentRunRequest) -> dict[str, Any]:
        if not development_console_enabled:
            raise HTTPException(status_code=403, detail="development_console_disabled")
        if development_runner is None:
            raise HTTPException(status_code=503, detail="home_assistant_not_configured")
        try:
            if request.operation == "all":
                results = development_runner.run_all()
                report = build_development_report("all", results, previous_development_report())
                if development_report_store:
                    development_report_store.save(report)
                return {"status": "ok", "operation": "all", "report": asdict(report), "results": [asdict(item) for item in results]}
            if request.operation.startswith("pack:"):
                operation = request.operation
                results = development_runner.run_pack(operation.removeprefix("pack:"))
                report = build_development_report(operation, results, previous_development_report())
                if development_report_store:
                    development_report_store.save(report)
                return {"status": "ok", "operation": operation, "report": asdict(report), "results": [asdict(item) for item in results]}
            result = development_runner.run(request.operation, request.parameters)
            report = build_development_report(request.operation, (result,), previous_development_report())
            if development_report_store:
                development_report_store.save(report)
            return {**asdict(result), "report": asdict(report)}
        except HomeAssistantUnavailable as error:
            return asdict(DevelopmentResult(status="unavailable", operation=request.operation, duration_ms=0, count=0, reason=str(error)))
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.post("/api/operator/preview")
    def operator_preview_resource(request: OperatorPreviewRequest) -> dict[str, Any]:
        try:
            return asdict(build_operator_preview(request.operation, request.target, request.capability, request.proposed, request.current))
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/development/reports")
    def development_reports_resource(limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, Any]]:
        if development_report_store is None:
            return []
        return [asdict(report) for report in development_report_store.list(limit)]

    @app.get("/api/audit", response_model=list[AuditEventResponse])
    def audit_events(
        limit: int = Query(default=100, ge=1, le=1000),
        decision: str | None = Query(default=None, max_length=64),
    ) -> list[AuditEventResponse]:
        if audit_reader is None:
            return []
        return [AuditEventResponse.from_domain(event) for event in audit_reader.list(limit=limit, decision=decision)]

    @app.get("/api/clients", response_model=list[ClientResponse])
    def list_client_resources() -> list[ClientResponse]:
        return [ClientResponse.from_domain(client) for client in list_clients.execute()]

    @app.get("/api/mcp/discovery", response_model=MCPDiscoveryResponse)
    def mcp_discovery_resource(request: Request) -> MCPDiscoveryResponse:
        token = parse_bearer_token(request.headers.get("authorization"))
        client = authenticate_client.execute(token or "")
        if client is None:
            raise HTTPException(status_code=401, detail="invalid_client_token")
        return MCPDiscoveryResponse(
            server_name="homeassistant-gateway-observer",
            transport="streamable-http",
            endpoint="/mcp/",
            client_id=client.client_id,
            profile=client.profile,
            capabilities=client.capabilities,
            tools=("gateway_diagnostics",),
        )

    @app.get("/api/client/me", response_model=ClientResponse)
    def client_identity_resource(request: Request) -> ClientResponse:
        token = parse_bearer_token(request.headers.get("authorization"))
        client = authenticate_client.execute(token or "")
        if client is None:
            raise HTTPException(status_code=401, detail="invalid_client_token")
        return ClientResponse.from_domain(client)

    @app.post("/api/policy/evaluate", response_model=PolicyDecisionResponse)
    def evaluate_policy_resource(request: EvaluatePolicyRequest) -> PolicyDecisionResponse:
        decision = authorize_request.execute(
            client_id=request.client_id,
            capability=request.capability,
            mutation=request.mutation,
        )
        return PolicyDecisionResponse(
            decision=decision.decision,
            reason=decision.reason,
        )

    @app.post(
        "/api/clients",
        response_model=IssuedClientResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def issue_client_resource(request: CreateClientRequest) -> IssuedClientResponse:
        try:
            issued = issue_client.execute(
                client_id=request.client_id,
                display_name=request.display_name,
                profile=request.profile,
                capabilities=request.capabilities,
            )
        except ValueError as error:
            reason = str(error)
            if reason == "client_already_exists":
                raise HTTPException(status_code=409, detail=reason) from error
            if reason in {"operator_disabled", "observer_operator_capability_conflict"}:
                raise HTTPException(status_code=403, detail=reason) from error
            raise HTTPException(status_code=400, detail=reason) from error

        client = ClientResponse.from_domain(issued.client)
        return IssuedClientResponse(**client.model_dump(), token=issued.token)

    @app.post("/api/clients/{client_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
    def revoke_client_resource(client_id: str) -> Response:
        revoke_client.execute(client_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post("/api/clients/{client_id}/rotate", response_model=IssuedClientResponse, status_code=status.HTTP_201_CREATED)
    def rotate_client_resource(client_id: str) -> IssuedClientResponse:
        try:
            issued = rotate_client.execute(client_id)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        client = ClientResponse.from_domain(issued.client)
        return IssuedClientResponse(**client.model_dump(), token=issued.token)

    if mcp_app is not None:
        app.mount("/mcp", mcp_app)
    return app
