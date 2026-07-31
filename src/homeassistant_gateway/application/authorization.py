from typing import Protocol

from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import (
    ClientPolicy,
    Decision,
    PolicyDecision,
    PolicyEngine,
    PolicyRequest,
)


class ClientPolicyRepository(Protocol):
    def get(self, client_id: str) -> Client | None: ...


class AuthorizeRequest:
    """Evaluate a capability without executing the requested operation."""

    def __init__(self, repository: ClientPolicyRepository, operator_enabled: bool) -> None:
        self._repository = repository
        self._operator_enabled = operator_enabled

    def execute(self, client_id: str, capability: str, mutation: bool) -> PolicyDecision:
        client = self._repository.get(client_id)
        if client is None:
            return PolicyDecision(Decision.DENIED, "unknown_client")
        if client.status is ClientStatus.REVOKED:
            return PolicyDecision(Decision.DENIED, "client_revoked")

        engine = PolicyEngine(
            operator_enabled=self._operator_enabled,
            clients={
                client.client_id: ClientPolicy(
                    profile=client.profile,
                    capabilities=client.capabilities,
                )
            },
        )
        return engine.evaluate(PolicyRequest(client_id, capability, mutation))
