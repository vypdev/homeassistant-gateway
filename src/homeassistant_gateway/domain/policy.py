from collections.abc import Mapping
from dataclasses import dataclass
from enum import Enum


class Profile(str, Enum):
    OBSERVER = "observer"
    OPERATOR = "operator"


class Decision(str, Enum):
    ALLOWED = "allowed"
    DENIED = "denied"
    APPROVAL_REQUIRED = "approval_required"


@dataclass(frozen=True)
class ClientPolicy:
    profile: Profile
    capabilities: frozenset[str]


@dataclass(frozen=True)
class PolicyRequest:
    client_id: str
    capability: str
    mutation: bool


@dataclass(frozen=True)
class PolicyDecision:
    decision: Decision
    reason: str


class PolicyEngine:
    """Pure capability policy; transport and Home Assistant remain outside this boundary."""

    def __init__(self, operator_enabled: bool, clients: Mapping[str, ClientPolicy]) -> None:
        self._operator_enabled = operator_enabled
        self._clients = dict(clients)

    def evaluate(self, request: PolicyRequest) -> PolicyDecision:
        client = self._clients.get(request.client_id)
        if client is None:
            return PolicyDecision(Decision.DENIED, "unknown_client")

        if request.capability not in client.capabilities:
            return PolicyDecision(Decision.DENIED, "capability_not_granted")

        if client.profile is Profile.OBSERVER and request.mutation:
            return PolicyDecision(Decision.DENIED, "observer_is_read_only")

        if client.profile is Profile.OPERATOR and not self._operator_enabled:
            return PolicyDecision(Decision.DENIED, "operator_disabled")

        if request.mutation:
            return PolicyDecision(Decision.APPROVAL_REQUIRED, "mutation_requires_approval")

        return PolicyDecision(Decision.ALLOWED, "read_allowed")
