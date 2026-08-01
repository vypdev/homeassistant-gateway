"""Application use cases for MCP client lifecycle management."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Profile


class ClientRepository(Protocol):
    def list(self) -> list[Client]: ...

    def get(self, client_id: str) -> Client | None: ...

    def save(self, client: Client) -> None: ...


class TokenIssuer(Protocol):
    def issue(self) -> tuple[str, str]:
        """Return one-time plaintext token and persisted digest."""
        ...


@dataclass(frozen=True)
class IssuedClient:
    client: Client
    token: str


class IssueClient:
    def __init__(
        self,
        repository: ClientRepository,
        token_issuer: TokenIssuer,
        clock: Callable[[], datetime],
        operator_enabled: bool,
    ) -> None:
        self._repository = repository
        self._token_issuer = token_issuer
        self._clock = clock
        self._operator_enabled = operator_enabled

    def execute(
        self,
        client_id: str,
        display_name: str,
        profile: Profile,
        capabilities: frozenset[str],
    ) -> IssuedClient:
        if not client_id.strip() or not display_name.strip():
            raise ValueError("client_identity_required")
        if self._repository.get(client_id) is not None:
            raise ValueError("client_already_exists")
        if profile is Profile.OPERATOR and not self._operator_enabled:
            raise ValueError("operator_disabled")
        if profile is Profile.OBSERVER and any(
            capability.startswith("ha.operator.") for capability in capabilities
        ):
            raise ValueError("observer_operator_capability_conflict")

        token, digest = self._token_issuer.issue()
        client = Client(
            client_id=client_id,
            display_name=display_name,
            profile=profile,
            capabilities=capabilities,
            created_at=self._clock(),
            status=ClientStatus.ACTIVE,
            token_digest=digest,
        )
        self._repository.save(client)
        return IssuedClient(client=client, token=token)


class RotateClient:
    """Replace an active client's bearer material and return plaintext only once."""

    def __init__(self, repository: ClientRepository, token_issuer: TokenIssuer) -> None:
        self._repository = repository
        self._token_issuer = token_issuer

    def execute(self, client_id: str) -> IssuedClient:
        client = self._repository.get(client_id)
        if client is None or client.status is ClientStatus.REVOKED:
            raise ValueError("client_not_active")
        token, digest = self._token_issuer.issue()
        client.token_digest = digest
        self._repository.save(client)
        return IssuedClient(client=client, token=token)


class ListClients:
    def __init__(self, repository: ClientRepository) -> None:
        self._repository = repository

    def execute(self) -> list[Client]:
        return self._repository.list()


class RevokeClient:
    def __init__(self, repository: ClientRepository, clock: Callable[[], datetime]) -> None:
        self._repository = repository
        self._clock = clock

    def execute(self, client_id: str) -> None:
        client = self._repository.get(client_id)
        if client is None or client.status is ClientStatus.REVOKED:
            return
        client.status = ClientStatus.REVOKED
        client.revoked_at = self._clock()
        self._repository.save(client)
