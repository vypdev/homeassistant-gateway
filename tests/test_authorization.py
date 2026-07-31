from datetime import UTC, datetime

from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Decision, Profile


class InMemoryClientRepository:
    def __init__(self, client: Client | None = None) -> None:
        self.client = client

    def get(self, client_id: str) -> Client | None:
        if self.client is not None and self.client.client_id == client_id:
            return self.client
        return None


def client(status: ClientStatus = ClientStatus.ACTIVE) -> Client:
    return Client(
        client_id="observer",
        display_name="Observer",
        profile=Profile.OBSERVER,
        capabilities=frozenset({"ha.read.states"}),
        created_at=datetime(2026, 7, 31, tzinfo=UTC),
        status=status,
        token_digest="digest",
    )


def test_authorize_request_uses_persisted_client_policy() -> None:
    use_case = AuthorizeRequest(InMemoryClientRepository(client()), operator_enabled=False)

    result = use_case.execute("observer", "ha.read.states", mutation=False)

    assert result.decision is Decision.ALLOWED
    assert result.reason == "read_allowed"


def test_revoked_client_is_denied_before_policy_evaluation() -> None:
    use_case = AuthorizeRequest(
        InMemoryClientRepository(client(ClientStatus.REVOKED)), operator_enabled=False
    )

    result = use_case.execute("observer", "ha.read.states", mutation=False)

    assert result.decision is Decision.DENIED
    assert result.reason == "client_revoked"
