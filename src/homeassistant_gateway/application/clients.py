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

    def delete(self, client_id: str) -> None: ...


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
        operator_services: frozenset[str] = frozenset(),
    ) -> IssuedClient:
        if not client_id.strip() or not display_name.strip():
            raise ValueError("client_identity_required")
        if self._repository.get(client_id) is not None:
            raise ValueError("client_already_exists")
        if profile is Profile.OPERATOR and not self._operator_enabled:
            raise ValueError("operator_disabled")
        if profile is Profile.OBSERVER and (any(
            capability.startswith("ha.write.") for capability in capabilities
        ) or operator_services):
            raise ValueError("observer_operator_capability_conflict")
        if profile is not Profile.OPERATOR and operator_services:
            raise ValueError("operator_services_require_operator_profile")

        token, digest = self._token_issuer.issue()
        client = Client(
            client_id=client_id,
            display_name=display_name,
            profile=profile,
            capabilities=capabilities,
            operator_services=operator_services,
            created_at=self._clock(),
            status=ClientStatus.ACTIVE,
            token_digest=digest,
        )
        self._repository.save(client)
        return IssuedClient(client=client, token=token)


class UpdateClientOperatorServices:
    def __init__(self, repository: ClientRepository) -> None:
        self._repository = repository

    def execute(self, client_id: str, services: frozenset[str]) -> Client:
        client = self._repository.get(client_id)
        if client is None:
            raise ValueError("client_not_found")
        if client.profile is not Profile.OPERATOR and services:
            raise ValueError("operator_services_require_operator_profile")
        updated = Client(
            client_id=client.client_id,
            display_name=client.display_name,
            profile=client.profile,
            capabilities=client.capabilities,
            created_at=client.created_at,
            status=client.status,
            token_digest=client.token_digest,
            revoked_at=client.revoked_at,
            operator_services=services,
        )
        self._repository.save(updated)
        return updated


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


class DeleteClient:
    """Permanently remove a client after its bearer token was revoked."""

    def __init__(self, repository: ClientRepository) -> None:
        self._repository = repository

    def execute(self, client_id: str) -> None:
        client = self._repository.get(client_id)
        if client is None:
            raise ValueError("client_not_found")
        if client.status is not ClientStatus.REVOKED:
            raise ValueError("client_must_be_revoked")
        self._repository.delete(client_id)


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
