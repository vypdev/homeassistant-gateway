import httpx
import pytest

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable, redact
from homeassistant_gateway.infrastructure.supervisor_home_assistant import (
    SupervisorHomeAssistantClient,
)


def make_client(handler):
    return SupervisorHomeAssistantClient(
        "supervisor-secret",
        base_url="http://supervisor/core/api",
        transport=httpx.MockTransport(handler),
    )


def test_states_uses_supervisor_auth_and_redacts_secret_fields() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == "http://supervisor/core/api/states"
        assert request.headers["authorization"] == "Bearer supervisor-secret"
        return httpx.Response(200, json=[{"entity_id": "light.kitchen", "state": "on", "attributes": {"api_token": "do-not-return"}}])

    client = make_client(handler)

    assert client.states() == [{"entity_id": "light.kitchen", "state": "on", "attributes": {"api_token": "[REDACTED]"}}]


def test_inventory_is_bounded_and_keeps_transport_outside_application() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/states"):
            return httpx.Response(200, json=[{"entity_id": "sensor.one"}])
        if request.url.path.endswith("/services"):
            return httpx.Response(200, json=[{"domain": "light", "services": {}}])
        raise AssertionError(request.url)

    assert make_client(handler).inventory()["counts"] == {"entities": 1, "services": 1}


def test_missing_optional_configuration_endpoint_is_reported_as_empty() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/config"):
            return httpx.Response(200, json={"location_name": "Home"})
        return httpx.Response(404, json={"message": "not available"})

    assert make_client(handler).configuration() == {"core": {"location_name": "Home"}, "entity_registry": [], "area_registry": []}


def test_history_and_logbook_use_bounded_query_parameters() -> None:
    paths: list[tuple[str, dict[str, str] | None]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append((request.url.path, dict(request.url.params)))
        return httpx.Response(200, json=[])

    client = make_client(handler)
    assert client.services() == []
    assert client.events() == []
    assert client.history("light.kitchen", "2026-08-01T00:00:00Z") == []
    assert client.logbook("light.kitchen", "2026-08-01T00:00:00Z") == []
    assert paths == [
        ("/core/api/services", {}),
        ("/core/api/events", {}),
        ("/core/api/history/period", {"filter_entity_id": "light.kitchen", "start_time": "2026-08-01T00:00:00Z"}),
        ("/core/api/logbook", {"entity": "light.kitchen", "start_time": "2026-08-01T00:00:00Z"}),
    ]


def test_history_normalizes_home_assistant_grouped_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[[{"entity_id": "sensor.temp", "state": "20"}, {"entity_id": "sensor.temp", "state": "21"}], [{"entity_id": "light.kitchen", "state": "on"}]])

    assert make_client(handler).history() == [
        {"entity_id": "sensor.temp", "states": [{"entity_id": "sensor.temp", "state": "20"}, {"entity_id": "sensor.temp", "state": "21"}]},
        {"entity_id": "light.kitchen", "states": [{"entity_id": "light.kitchen", "state": "on"}]},
    ]


def test_extended_registry_matrix_uses_expected_paths() -> None:
    paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append(request.url.path)
        if "/config/" in request.url.path:
            return httpx.Response(200, json=[{"id": request.url.path}])
        return httpx.Response(200, json=[{"entity_id": "script.test"}, {"entity_id": "light.kitchen"}])

    client = make_client(handler)
    assert client.extended_read("devices") == [{"id": "/core/api/config/device_registry/list"}]
    assert client.extended_read("areas") == [{"id": "/core/api/config/area_registry/list"}]
    assert client.extended_read("scripts") == [{"entity_id": "script.test"}]
    assert paths == [
        "/core/api/config/device_registry/list",
        "/core/api/config/area_registry/list",
        "/core/api/states",
    ]


def test_required_extended_resource_404_is_explicit() -> None:
    client = make_client(lambda request: httpx.Response(404))

    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_http_404"):
        client.services()


def test_upstream_error_is_sanitized_and_explicit() -> None:
    client = make_client(lambda request: httpx.Response(503))

    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_http_503"):
        client.states()


def test_transport_failure_is_not_misreported_as_empty_data() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("secret-hostname.example", request=request)

    with pytest.raises(HomeAssistantUnavailable, match="transport_unavailable"):
        make_client(handler).states()


def test_upstream_error_includes_safe_request_context() -> None:
    client = make_client(lambda request: httpx.Response(503))

    with pytest.raises(HomeAssistantUnavailable) as captured:
        client.history("sensor.temp", "2026-08-01T00:00:00Z")

    assert '"path": "/history/period"' in str(captured.value)
    assert '"params": ["filter_entity_id", "start_time"]' in str(captured.value)
    assert "supervisor-secret" not in str(captured.value)


def test_ui_context_reads_supported_core_preferences_with_fallback() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/config"):
            return httpx.Response(200, json={"language": "es", "theme": "dark"})
        return httpx.Response(404)

    assert make_client(handler).ui_context() == {"locale": "es", "theme": "dark"}


def test_redact_handles_nested_values() -> None:
    assert redact({"nested": [{"password": "hidden"}], "safe": "value"}) == {"nested": [{"password": "[REDACTED]"}], "safe": "value"}
