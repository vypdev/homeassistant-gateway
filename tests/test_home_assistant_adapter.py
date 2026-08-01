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
        ("/core/api/history/period/2026-08-01T00:00:00Z", {"filter_entity_id": "light.kitchen"}),
        ("/core/api/logbook/2026-08-01T00:00:00Z", {"entity": "light.kitchen"}),
    ]


def test_default_history_window_uses_home_assistant_utc_format() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        timestamp = request.url.path.rsplit("/", 1)[-1]
        assert timestamp.endswith("Z")
        assert "+00:00" not in timestamp
        assert "." not in timestamp
        return httpx.Response(200, json=[])

    assert make_client(handler).history("sensor.temp") == []


def test_transport_retries_once_but_http_errors_are_not_retried() -> None:
    attempts = 0

    def transient_handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise httpx.ConnectError("temporary", request=request)
        return httpx.Response(200, json=[])

    assert make_client(transient_handler).logbook("sensor.temp") == []
    assert attempts == 2

    attempts = 0

    def http_error_handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(400)

    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_http_400"):
        make_client(http_error_handler).history("sensor.temp")
    assert attempts == 1


def test_health_details_uses_current_history_and_logbook_routes() -> None:
    paths: list[tuple[str, dict[str, str]]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append((request.url.path, dict(request.url.params)))
        if request.url.path.endswith("/states"):
            return httpx.Response(200, json=[{"entity_id": "sensor.temperature"}])
        return httpx.Response(200, json=[] if request.url.path.endswith(("/services", "/events")) else {})

    checks = make_client(handler).health_details()
    assert checks["status"] == "ready"
    assert any(path.startswith("/core/api/history/period/") and params == {"filter_entity_id": "sensor.temperature"} for path, params in paths)
    assert any(path.startswith("/core/api/logbook/") and params == {"entity": "sensor.temperature"} for path, params in paths)


def test_history_without_entity_uses_one_bounded_real_entity_probe() -> None:
    paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append(request.url.path)
        if request.url.path.endswith("/states"):
            return httpx.Response(200, json=[{"entity_id": "sensor.temperature"}])
        return httpx.Response(200, json=[])

    assert make_client(handler).history() == []
    assert paths == ["/core/api/states", "/core/api/history/period/" + paths[1].rsplit("/", 1)[-1]]


def test_history_normalizes_home_assistant_grouped_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[[{"entity_id": "sensor.temp", "state": "20"}, {"entity_id": "sensor.temp", "state": "21"}], [{"entity_id": "light.kitchen", "state": "on"}]])

    assert make_client(handler).history("sensor.temp") == [
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

    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_transport_connection"):
        make_client(handler).states()


def test_timeout_failure_is_classified_and_keeps_logical_path() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("secret-timeout", request=request)

    with pytest.raises(HomeAssistantUnavailable) as captured:
        make_client(handler).history("sensor.temp", "2026-08-01T00:00:00Z")

    reason = str(captured.value)
    assert "home_assistant_transport_timeout" in reason
    assert '"path": "/history/period"' in reason
    assert "2026-08-01" not in reason
    assert "sensor.temp" not in reason


def test_upstream_error_includes_safe_request_context() -> None:
    client = make_client(lambda request: httpx.Response(503))

    with pytest.raises(HomeAssistantUnavailable) as captured:
        client.history("sensor.temp", "2026-08-01T00:00:00Z")

    assert '"path": "/history/period"' in str(captured.value)
    assert '"params": ["filter_entity_id"]' in str(captured.value)
    assert "supervisor-secret" not in str(captured.value)


def test_ui_context_reads_supported_core_preferences_with_fallback() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/config"):
            return httpx.Response(200, json={"language": "es", "theme": "dark"})
        return httpx.Response(404)

    assert make_client(handler).ui_context() == {"locale": "es", "theme": "dark"}


def test_redact_handles_nested_values() -> None:
    assert redact({"nested": [{"password": "hidden"}], "safe": "value"}) == {"nested": [{"password": "[REDACTED]"}], "safe": "value"}
