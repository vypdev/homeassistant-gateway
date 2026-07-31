from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI

from homeassistant_gateway.application.clients import IssueClient, ListClients, RevokeClient
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer
from homeassistant_gateway.infrastructure.storage.sqlite_clients import SQLiteClientRepository
from homeassistant_gateway.presentation.http import create_app


@dataclass(frozen=True)
class AppSettings:
    data_dir: Path
    operator_enabled: bool = False


def build_app(settings: AppSettings) -> FastAPI:
    """Construct the application graph without reading process-global configuration."""
    repository = SQLiteClientRepository(settings.data_dir / "gateway.sqlite3")
    token_issuer = SecureTokenIssuer()
    clock = lambda: datetime.now(UTC)

    return create_app(
        issue_client=IssueClient(
            repository=repository,
            token_issuer=token_issuer,
            clock=clock,
            operator_enabled=settings.operator_enabled,
        ),
        list_clients=ListClients(repository),
        revoke_client=RevokeClient(repository, clock),
    )
