import pytest

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable
from homeassistant_gateway.infrastructure.home_assistant.service_mutation import (
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
