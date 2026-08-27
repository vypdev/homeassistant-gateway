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
        self.params = None
        self.response_limit = None

    def post_json(self, path: str, payload: dict, params=None, response_limit=None) -> tuple[int, object]:
        self.calls.append((path, payload))
        self.params = params
        self.response_limit = response_limit
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


def test_todo_get_items_requests_home_assistant_service_response() -> None:
    transport = Transport(response={"todo.tareas_ha": {"items": [{"summary": "Call Robert"}]}})
    adapter = SupervisorServiceMutationAdapter(transport, frozenset({"todo.get_items"}))

    result = adapter.call_service(
        "todo",
        "get_items",
        {"entity_id": "todo.tareas_ha", "status": ["needs_action", "completed"]},
    )

    assert result == {"todo.tareas_ha": {"items": [{"summary": "Call Robert"}]}}
    assert transport.params == {"return_response": "true"}
    assert transport.response_limit is not None


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"entity_id": "light.test"},
        {"entity_id": "todo.first,todo.second"},
        {"entity_id": ["todo.first", "todo.second"]},
        {"entity_id": "todo.first", "target": {"entity_id": "todo.second"}},
    ],
)
def test_todo_get_items_requires_exactly_one_todo_entity_target(payload: dict) -> None:
    transport = Transport(response={"todo.first": {"items": []}})
    adapter = SupervisorServiceMutationAdapter(transport, frozenset({"todo.get_items"}))

    with pytest.raises(ValueError, match="todo_entity_target_invalid"):
        adapter.call_service("todo", "get_items", payload)
    assert transport.calls == []


@pytest.mark.parametrize(
    "response",
    [
        {},
        {"todo.first": {"items": []}, "todo.second": {"items": []}},
        {"todo.other": {"items": []}},
        {"todo.first": []},
        {"todo.first": {"items": {}}},
        {"todo.first": {"items": [{"summary": object()}]}},
        {"todo.first": {"items": [{"summary": "x"}], "extra": True}},
    ],
)
def test_todo_get_items_rejects_noncanonical_upstream_response(response: object) -> None:
    transport = Transport(response=response)
    adapter = SupervisorServiceMutationAdapter(transport, frozenset({"todo.get_items"}))

    with pytest.raises(HomeAssistantUnavailable) as raised:
        adapter.call_service("todo", "get_items", {"entity_id": "todo.first"})

    assert raised.value.code == "home_assistant_invalid_service_response"
    assert "todo.first" not in str(raised.value) or response == {"todo.first": {"items": {}}}


def test_todo_get_items_rejects_response_item_and_serialized_size_boundaries() -> None:
    too_many = {"todo.first": {"items": [{"summary": "x"}] * 3}}
    adapter = SupervisorServiceMutationAdapter(
        Transport(response=too_many),
        frozenset({"todo.get_items"}),
        max_response_items=2,
    )
    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_invalid_service_response"):
        adapter.call_service("todo", "get_items", {"entity_id": "todo.first"})

    too_large = {"todo.first": {"items": [{"summary": "x" * 11}]}}
    adapter = SupervisorServiceMutationAdapter(
        Transport(response=too_large),
        frozenset({"todo.get_items"}),
        max_response_field_size=10,
    )
    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_invalid_service_response"):
        adapter.call_service("todo", "get_items", {"entity_id": "todo.first"})

    adapter = SupervisorServiceMutationAdapter(
        Transport(response={"todo.first": {"items": [{"summary": "12345"}]}}),
        frozenset({"todo.get_items"}),
        max_response_bytes=40,
    )
    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_invalid_service_response"):
        adapter.call_service("todo", "get_items", {"entity_id": "todo.first"})


def test_shopping_list_service_does_not_require_entity_target() -> None:
    transport = Transport(response=[])
    adapter = SupervisorOperatorMutationAdapter(
        SupervisorServiceMutationAdapter(transport, frozenset({"shopping_list.add_item"})),
    )

    result = adapter.execute("ha.call_service", "shopping_list.add_item", {"name": "Milk"})

    assert result["status"] == "ok"
    assert transport.calls == [("/services/shopping_list/add_item", {"name": "Milk"})]


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
