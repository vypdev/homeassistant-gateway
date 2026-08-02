import uuid
from collections.abc import Awaitable, Callable
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, Response
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
    DevelopmentToolRunner,
    development_catalog,
    development_packs,
)
from homeassistant_gateway.application.development_jobs import DevelopmentJobManager
from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.application.operator_preview import build_operator_preview
from homeassistant_gateway.presentation.auth_headers import parse_bearer_token
from homeassistant_gateway.presentation.http_middleware import request_identity_middleware
from homeassistant_gateway.presentation.http_models import (
    AuditEventResponse,
    ClientResponse,
    CreateClientRequest,
    DevelopmentRunRequest,
    EvaluatePolicyRequest,
    HealthResponse,
    IssuedClientResponse,
    MCPDiscoveryResponse,
    OperatorPreviewRequest,
    PolicyDecisionResponse,
    ReadinessResponse,
)
from homeassistant_gateway.presentation.ui import UI_DIST, index_response


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
    app = FastAPI(title="Home Assistant Gateway", version="0.4.14", lifespan=lifespan)
    sink = audit_sink or NoopAuditSink()

    development_jobs = DevelopmentJobManager(development_runner, development_report_store) if development_runner is not None else None
    if development_jobs is not None:
        app.router.on_shutdown.append(development_jobs.shutdown)
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
        return await request_identity_middleware(request, call_next, record_audit)

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

    @app.get("/api/health/details")
    def health_details_resource() -> dict[str, Any]:
        if home_assistant is None:
            return {"status": "disabled", "checks": []}
        provider = getattr(home_assistant, "health_details", None)
        if not callable(provider):
            return {"status": "unknown", "checks": []}
        result = provider()
        return result if isinstance(result, dict) else {"status": "unknown", "checks": []}

    @app.get("/api/ui/context")
    def ui_context_resource(request: Request) -> dict[str, str]:
        context = {"locale": "en", "theme": "auto"}
        if home_assistant is not None:
            try:
                provider = getattr(home_assistant, "ui_context", None)
                if callable(provider):
                    provided = provider()
                    if isinstance(provided, dict):
                        context.update({str(key): str(value) for key, value in provided.items()})
            except HomeAssistantUnavailable:
                pass
        if context["locale"] == "en":
            accept_language = request.headers.get("accept-language", "")
            if accept_language:
                context["locale"] = accept_language.split(",", 1)[0].split(";", 1)[0].strip().replace("_", "-").lower() or "en"
        return context

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

    @app.post("/api/development/run", status_code=202)
    def development_run_resource(request: DevelopmentRunRequest) -> Response:
        if not development_console_enabled:
            raise HTTPException(status_code=403, detail="development_console_disabled")
        if development_jobs is None:
            raise HTTPException(status_code=503, detail="home_assistant_not_configured")
        try:
            job_id = development_jobs.start(request.operation, request.parameters)
        except RuntimeError as error:
            raise HTTPException(status_code=429, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        return JSONResponse(
            status_code=202,
            headers={"Location": f"/api/development/jobs/{job_id}"},
            content={"status": "queued", "job_id": job_id, "operation": request.operation},
        )

    @app.get("/api/development/jobs/{job_id}")
    def development_job_resource(job_id: str) -> dict[str, Any]:
        if development_jobs is None:
            raise HTTPException(status_code=503, detail="home_assistant_not_configured")
        snapshot = development_jobs.snapshot(job_id)
        if snapshot is None:
            raise HTTPException(status_code=404, detail="development_job_not_found")
        return snapshot

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
            tools=("gateway_diagnostics", "ha_inventory", "ha_states", "ha_automations", "ha_configuration", "ha_services", "ha_events", "ha_history", "ha_logbook", "ha_devices", "ha_areas", "ha_floors", "ha_labels", "ha_entity_registry", "ha_scripts", "ha_scenes", "ha_helpers", "ha_integrations"),
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
