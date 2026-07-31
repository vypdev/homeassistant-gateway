from typing import Protocol

from homeassistant_gateway.domain.clients import Client, ClientStatus


class ClientCredentialRepository(Protocol):
    def find_by_token_digest(self, token_digest: str) -> Client | None: ...


class TokenVerifier(Protocol):
    def digest(self, token: str) -> str: ...

    def verify(self, token: str, expected_digest: str) -> bool: ...


class AuthenticateClient:
    """Resolve an active client from a bearer token without exposing its digest."""

    def __init__(self, repository: ClientCredentialRepository, token_verifier: TokenVerifier) -> None:
        self._repository = repository
        self._token_verifier = token_verifier

    def execute(self, token: str) -> Client | None:
        if not token:
            return None
        token_digest = self._token_verifier.digest(token)
        client = self._repository.find_by_token_digest(token_digest)
        if client is None or client.status is ClientStatus.REVOKED:
            return None
        if not self._token_verifier.verify(token, client.token_digest):
            return None
        return client
