import pytest

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable
from homeassistant_gateway.infrastructure.home_assistant.service_mutation import (
    SupervisorOperatorMutationAdapter,
    SupervisorServiceMutationAdapter,
)


class Transport:
    def __init__(self, status: int = 200, response=None) -> None:
        self.status = status
        self.response = response if response is not None else [{"entity_id": "light.test", "token": "secret"}]
        self.calls: list[tuple[str, dict]] = []

    def post_json(self, path: str, payload: dict) -> tuple[int, object]:
        self.calls.append((path, payload))
        return self.status, self.response


def test_service_adapter_posts_only_allowlisted_service_and_redacts_response() -> None:
    transport = Transport()
    adapter = SupervisorServiceMutationAdapter(transport, frozenset({"light.turn_on"}))
    result = adapter.call_service("light", "turn_on", {"entity_id": "light.test"})
    assert result == [{"entity_id": "light.test", "token": "[REDACTED]"}]
    assert transport.calls == [("/services/light/turn_on", {"entity_id": "light.test"})]


def test_service_adapter_rejects_unallowlisted_or_malformed_services() -> None:
    transport = Transport()
    adapter = SupervisorServiceMutationAdapter(transport, frozenset({"light.turn_on"}))
    with pytest.raises(PermissionError, match="service_not_allowlisted"):
        adapter.call_service("switch", "turn_on", {})
    with pytest.raises(ValueError, match="invalid_service_name"):
        adapter.call_service("light/../", "turn_on", {})
    assert transport.calls == []


def test_service_adapter_classifies_upstream_and_shape_failures() -> None:
    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_http_403"):
        SupervisorServiceMutationAdapter(Transport(403), frozenset({"light.turn_on"})).call_service("light", "turn_on", {})
    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_invalid_service_response"):
        SupervisorServiceMutationAdapter(Transport(response={"changed": True}), frozenset({"light.turn_on"})).call_service("light", "turn_on", {})


def test_operator_adapter_requires_entity_target_and_keeps_other_operations_explicit() -> None:
    service = SupervisorServiceMutationAdapter(Transport(), frozenset({"light.turn_on"}))
    adapter = SupervisorOperatorMutationAdapter(service)
    with pytest.raises(ValueError, match="service_entity_target_invalid"):
        adapter.execute("ha.call_service", "light.turn_on", {})
    assert adapter.execute("ha.update_config", "config", {}) == {
        "status": "unsupported",
        "reason": "operator_operation_not_connected",
    }


def test_operator_adapter_maps_allowlisted_automation_actions_without_leaking_control_fields() -> None:
    transport = Transport()
    service = SupervisorServiceMutationAdapter(transport, frozenset({"automation.trigger"}))
    adapter = SupervisorOperatorMutationAdapter(service)
    result = adapter.execute(
        "ha.update_automation",
        "automation.test",
        {"entity_id": "automation.test", "action": "trigger"},
    )
    assert result["status"] == "ok"
    assert transport.calls == [("/services/automation/trigger", {"entity_id": "automation.test"})]
