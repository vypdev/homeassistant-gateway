import re
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from homeassistant_gateway.application.audit import AuditEvent, AuditSink, NoopAuditSink
from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.clients import (
    IssueClient,
    ListClients,
    RevokeClient,
)
from homeassistant_gateway.domain.clients import Client
from homeassistant_gateway.domain.policy import Decision, Profile
from homeassistant_gateway.presentation.ui import index_response


class HealthResponse(BaseModel):
    status: str


class ReadinessResponse(BaseModel):
    status: str
    storage: str
    mcp: str


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
    authenticate_client: AuthenticateClient,
    authorize_request: AuthorizeRequest,
    audit_sink: AuditSink | None = None,
    mcp_app: Any | None = None,
    lifespan: Any | None = None,
) -> FastAPI:
    """Build the HTTP adapter around already-wired application use cases."""
    app = FastAPI(title="Home Assistant Gateway", version="0.1.0", lifespan=lifespan)
    sink = audit_sink or NoopAuditSink()

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
        record_audit(
            request,
            response,
            "allowed" if response.status_code < 400 else "denied",
            "success" if response.status_code < 400 else "error",
        )
        return response

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def index() -> HTMLResponse:
        return index_response()

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.get("/ready", response_model=ReadinessResponse)
    def readiness() -> ReadinessResponse:
        return ReadinessResponse(
            status="ready",
            storage="ready",
            mcp="ready" if mcp_app is not None else "disabled",
        )

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

    if mcp_app is not None:
        app.mount("/mcp", mcp_app)
    return app
