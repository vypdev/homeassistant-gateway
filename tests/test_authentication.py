from datetime import UTC, datetime

from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Profile
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer


class InMemoryCredentialRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def find_by_token_digest(self, token_digest: str) -> Client | None:
        if token_digest == self.client.token_digest:
            return self.client
        return None


def make_client(status: ClientStatus = ClientStatus.ACTIVE) -> Client:
    issuer = SecureTokenIssuer()
    _token, digest = issuer.issue()
    return Client(
        client_id="observer",
        display_name="Observer",
        profile=Profile.OBSERVER,
        capabilities=frozenset({"ha.read.states"}),
        created_at=datetime(2026, 7, 31, tzinfo=UTC),
        status=status,
        token_digest=digest,
    )


def test_authenticate_client_resolves_valid_token_to_active_client() -> None:
    issuer = SecureTokenIssuer()
    token, digest = issuer.issue()
    client = make_client()
    client.token_digest = digest
    use_case = AuthenticateClient(InMemoryCredentialRepository(client), issuer)

    authenticated = use_case.execute(token)

    assert authenticated is client


def test_invalid_or_revoked_token_is_not_authenticated() -> None:
    issuer = SecureTokenIssuer()
    token, digest = issuer.issue()
    client = make_client(ClientStatus.REVOKED)
    client.token_digest = digest
    use_case = AuthenticateClient(InMemoryCredentialRepository(client), issuer)

    assert use_case.execute("hgw_invalid") is None
    assert use_case.execute(token) is None
