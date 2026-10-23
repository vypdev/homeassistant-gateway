import pytest

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable
from homeassistant_gateway.application.operator_mutations import OperatorMutationService
from homeassistant_gateway.application.operator_security import (
    ApprovalService,
    IdempotencyRegistry,
    OperatorControl,
)


class AuditCollector:
    def __init__(self) -> None:
        self.events: list[tuple[str, str, str, str]] = []

    def record(self, operation: str, target: str, decision: str, outcome: str) -> None:
        self.events.append((operation, target, decision, outcome))


class UnavailableMutation:
    def execute(self, operation, target, proposed):
        raise HomeAssistantUnavailable("home_assistant_invalid_service_response")


def service(enabled: bool = False) -> OperatorMutationService:
    return OperatorMutationService(OperatorControl(enabled), ApprovalService(), IdempotencyRegistry())


def test_preview_is_bounded_and_explicitly_disabled() -> None:
    preview = service().preview("ha.call_service", "light.test", "ha.write.services", {"state": "on"}, {"state": "off"})
    assert preview.execution == "disabled"
    assert preview.reason == "mutation_execution_disabled"
    assert preview.before == {"state": "off"}
    assert preview.after == {"state": "on"}
    assert preview.approval_required is True


def test_preview_rejects_capability_mismatch() -> None:
    with pytest.raises(ValueError, match="operator_capability_mismatch"):
        service().preview("ha.call_service", "light.test", "ha.write.automations", {})


def test_execute_never_reaches_home_assistant_without_enabled_control() -> None:
    with pytest.raises(PermissionError, match="operator_disabled"):
        service().execute(
            "ha.call_service",
            "light.test",
            "ha.write.services",
            {"state": "on"},
            "approval",
            "token",
            "request",
        )


def test_enabled_service_without_adapter_is_explicitly_unsupported() -> None:
    audit = AuditCollector()
    operator = OperatorMutationService(OperatorControl(True), ApprovalService(), IdempotencyRegistry(), audit=audit)
    grant = operator.request_approval("ha.call_service", "light.test", "ha.write.services", {"state": "on"})
    result = operator.execute(
        "ha.call_service",
        "light.test",
        "ha.write.services",
        {"state": "on"},
        grant.approval_id,
        grant.token,
        "request-1",
    )
    assert result == {"status": "unsupported", "reason": "mutation_adapter_not_configured", "execution": "disabled"}
    assert audit.events == [("ha.call_service", "light.test", "unsupported", "mutation_adapter_not_configured")]


def test_enabled_service_rejects_replayed_idempotency_after_first_attempt() -> None:
    operator = service(enabled=True)
    grant = operator.request_approval("ha.call_service", "light.test", "ha.write.services", {"state": "on"})
    operator.execute("ha.call_service", "light.test", "ha.write.services", {"state": "on"}, grant.approval_id, grant.token, "request-1")
    with pytest.raises(ValueError, match="approval_not_found_or_expired|approval_invalid_or_replayed"):
        operator.execute("ha.call_service", "light.test", "ha.write.services", {"state": "on"}, grant.approval_id, grant.token, "request-2")


def test_upstream_unavailability_is_audited_and_propagates_to_public_mapping() -> None:
    audit = AuditCollector()
    operator = OperatorMutationService(
        OperatorControl(True),
        ApprovalService(),
        IdempotencyRegistry(),
        mutation_port=UnavailableMutation(),
        audit=audit,
    )
    grant = operator.request_approval("ha.call_service", "todo.get_items", "ha.write.services", {"entity_id": "todo.tasks"})

    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_invalid_service_response"):
        operator.execute(
            "ha.call_service",
            "todo.get_items",
            "ha.write.services",
            {"entity_id": "todo.tasks"},
            grant.approval_id,
            grant.token,
            "request-unavailable",
        )
    assert audit.events == [("ha.call_service", "todo.get_items", "allowed", "unavailable")]
