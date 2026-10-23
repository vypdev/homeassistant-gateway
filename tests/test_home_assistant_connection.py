import httpx
import pytest

from homeassistant_gateway.infrastructure.home_assistant.connection import (
    HomeAssistantConnectionMode,
    resolve_home_assistant_connection,
)
from homeassistant_gateway.infrastructure.home_assistant.client_adapter import HomeAssistantClient


def test_resolves_supervisor_rest_and_websocket_endpoints() -> None:
    connection = resolve_home_assistant_connection(
        HomeAssistantConnectionMode.SUPERVISOR,
        "http://supervisor/core/api/",
        "secret",
    )

    assert connection.rest_api_url == "http://supervisor/core/api"
    assert connection.websocket_url == "ws://supervisor/core/websocket"
    assert "secret" not in repr(connection)
    assert "[REDACTED]" in repr(connection)


def test_resolves_standalone_http_endpoints() -> None:
    connection = resolve_home_assistant_connection(
        "standalone",
        "http://homeassistant:8123/",
        "secret",
    )

    assert connection.rest_api_url == "http://homeassistant:8123/api"
    assert connection.websocket_url == "ws://homeassistant:8123/api/websocket"


def test_resolves_standalone_https_endpoints() -> None:
    connection = resolve_home_assistant_connection(
        "standalone",
        "https://ha.example.test",
        "secret",
    )

    assert connection.rest_api_url == "https://ha.example.test/api"
    assert connection.websocket_url == "wss://ha.example.test/api/websocket"


def test_standalone_client_uses_core_api_path_and_bearer_token() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == "http://homeassistant:8123/api/states"
        assert request.headers["authorization"] == "Bearer standalone-secret"
        return httpx.Response(200, json=[{"entity_id": "sensor.test"}])

    client = HomeAssistantClient(
        "standalone-secret",
        base_url="http://homeassistant:8123/api",
        transport=httpx.MockTransport(handler),
    )

    assert client.states() == [{"entity_id": "sensor.test"}]


def test_standalone_client_resolves_core_websocket_path() -> None:
    client = HomeAssistantClient(
        "standalone-secret",
        base_url="http://homeassistant:8123/api",
    )

    assert client._websocket_url(client._base_url) == "ws://homeassistant:8123/api/websocket"


@pytest.mark.parametrize(
    ("mode", "url", "token", "error"),
    [
        ("unknown", "http://ha:8123", "token", "invalid_home_assistant_mode"),
        ("standalone", "", "token", "home_assistant_url_required"),
        ("standalone", "http://ha:8123", "", "home_assistant_token_required"),
        ("standalone", "ftp://ha:8123", "token", "invalid_home_assistant_url"),
        ("standalone", "http://user:pass@ha:8123", "token", "home_assistant_url_credentials_forbidden"),
        ("standalone", "http://ha:8123/api?token=secret", "token", "home_assistant_url_query_forbidden"),
        ("standalone", "http://supervisor/core/api", "token", "standalone_supervisor_url_forbidden"),
        ("supervisor", "http://supervisor", "token", "invalid_supervisor_api_url"),
    ],
)
def test_rejects_invalid_connection_configuration(mode: str, url: str, token: str, error: str) -> None:
    with pytest.raises(ValueError, match=error):
        resolve_home_assistant_connection(mode, url, token)
