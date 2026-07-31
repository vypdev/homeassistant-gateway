from datetime import UTC, datetime

import pytest

from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.observer import ObserverDiagnostics
from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Profile
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer


class Repository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def find_by_token_digest(self, digest: str) -> Client | None:
        return self.client if self.client.token_digest == digest else None

    def get(self, client_id: str) -> Client | None:
        return self.client if self.client.client_id == client_id else None


def test_observer_diagnostics_requires_and_reports_read_capability() -> None:
    issuer = SecureTokenIssuer()
    token, digest = issuer.issue()
    client = Client(
        client_id="observer",
        display_name="Observer",
        profile=Profile.OBSERVER,
        capabilities=frozenset({"ha.read.diagnostics"}),
        created_at=datetime(2026, 7, 31, tzinfo=UTC),
        status=ClientStatus.ACTIVE,
        token_digest=digest,
    )
    repository = Repository(client)
    diagnostics = ObserverDiagnostics(
        AuthenticateClient(repository, issuer),
        AuthorizeRequest(repository, operator_enabled=False),
    )

    result = diagnostics.execute(token)

    assert result.status == "ok"
    assert result.client_id == "observer"
    assert result.profile == "observer"


def test_observer_diagnostics_rejects_missing_capability() -> None:
    issuer = SecureTokenIssuer()
    token, digest = issuer.issue()
    client = Client(
        client_id="observer",
        display_name="Observer",
        profile=Profile.OBSERVER,
        capabilities=frozenset(),
        created_at=datetime(2026, 7, 31, tzinfo=UTC),
        status=ClientStatus.ACTIVE,
        token_digest=digest,
    )
    repository = Repository(client)
    diagnostics = ObserverDiagnostics(
        AuthenticateClient(repository, issuer),
        AuthorizeRequest(repository, operator_enabled=False),
    )

    with pytest.raises(PermissionError, match="capability_not_granted"):
        diagnostics.execute(token)
