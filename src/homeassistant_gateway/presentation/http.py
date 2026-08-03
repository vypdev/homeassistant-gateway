import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import Response
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
)
from homeassistant_gateway.application.development_jobs import DevelopmentJobManager
from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
)
from homeassistant_gateway.application.operator_mutations import OperatorMutationService
from homeassistant_gateway.presentation.audit_routes import (
    AuditRouteDependencies,
    register_audit_routes,
)
from homeassistant_gateway.presentation.client_routes import (
    ClientRouteDependencies,
    register_client_routes,
)
from homeassistant_gateway.presentation.development_routes import (
    DevelopmentRouteDependencies,
    register_development_routes,
)
from homeassistant_gateway.presentation.health_routes import (
    HealthRouteDependencies,
    register_health_routes,
)
from homeassistant_gateway.presentation.http_middleware import request_identity_middleware
from homeassistant_gateway.presentation.ui import UI_DIST


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
    operator_enabled: bool = False,
    operator_mutations: OperatorMutationService | None = None,
    operator_capabilities: tuple[str, ...] = (),
    registered_mutation_tools: tuple[str, ...] = (),
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

    register_health_routes(app, HealthRouteDependencies(home_assistant=home_assistant, mcp_app=mcp_app))

    register_development_routes(
        app,
        DevelopmentRouteDependencies(
            home_assistant=home_assistant,
            development_jobs=development_jobs,
            development_report_store=development_report_store,
            enabled=development_console_enabled,
            operator_enabled=operator_enabled,
            operator_mutations=operator_mutations,
            operator_capabilities=operator_capabilities,
            registered_mutation_tools=registered_mutation_tools,
            authenticate_client=authenticate_client,
            authorize_request=authorize_request,
        ),
    )

    register_audit_routes(app, AuditRouteDependencies(audit_reader=audit_reader))

    register_client_routes(
        app,
        ClientRouteDependencies(
            issue_client=issue_client,
            list_clients=list_clients,
            revoke_client=revoke_client,
            rotate_client=rotate_client,
            authenticate_client=authenticate_client,
            authorize_request=authorize_request,
        ),
    )

    if mcp_app is not None:
        app.mount("/mcp", mcp_app)
    return app
