from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI

from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.clients import IssueClient, ListClients, RevokeClient
from homeassistant_gateway.application.observer import ObserverDiagnostics
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer
from homeassistant_gateway.infrastructure.storage.sqlite_audit import SQLiteAuditRepository
from homeassistant_gateway.infrastructure.storage.sqlite_clients import SQLiteClientRepository
from homeassistant_gateway.infrastructure.supervisor_home_assistant import (
    SupervisorHomeAssistantClient,
)
from homeassistant_gateway.presentation.http import create_app
from homeassistant_gateway.presentation.mcp import create_mcp_app


@dataclass(frozen=True)
class AppSettings:
    data_dir: Path
    operator_enabled: bool = False
    supervisor_token: str | None = None
    supervisor_url: str = "http://supervisor/core/api"
    mcp_allowed_hosts: tuple[str, ...] = (
        "localhost",
        "127.0.0.1",
        "[::1]",
        "homeassistant",
        "homeassistant.local",
    )


def build_app(settings: AppSettings) -> FastAPI:
    """Construct the application graph without reading process-global configuration."""
    database = settings.data_dir / "gateway.sqlite3"
    repository = SQLiteClientRepository(database)
    audit_repository = SQLiteAuditRepository(database)
    token_issuer = SecureTokenIssuer()
    clock = lambda: datetime.now(UTC)

    authenticate_client = AuthenticateClient(repository, token_issuer)
    authorize_request = AuthorizeRequest(repository, settings.operator_enabled)
    observer_diagnostics = ObserverDiagnostics(authenticate_client, authorize_request)
    home_assistant = (
        SupervisorHomeAssistantClient(settings.supervisor_token, base_url=settings.supervisor_url)
        if settings.supervisor_token
        else None
    )
    mcp_bundle = create_mcp_app(
        observer_diagnostics,
        authenticate_client.execute,
        authorize_request.execute,
        home_assistant=home_assistant,
        allowed_hosts=settings.mcp_allowed_hosts,
    )

    return create_app(
        issue_client=IssueClient(
            repository=repository,
            token_issuer=token_issuer,
            clock=clock,
            operator_enabled=settings.operator_enabled,
        ),
        list_clients=ListClients(repository),
        revoke_client=RevokeClient(repository, clock),
        authenticate_client=authenticate_client,
        authorize_request=authorize_request,
        audit_sink=audit_repository,
        mcp_app=mcp_bundle.application,
        home_assistant=home_assistant,
        lifespan=mcp_bundle.lifespan,
    )
