from __future__ import annotations

import json
from threading import Thread
from time import sleep
from typing import Any

import pytest
from websockets.sync.server import serve

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable
from homeassistant_gateway.infrastructure.home_assistant.websocket_client import (
    SupervisorWebSocketClient,
)


class FakeSocket:
    def __init__(self, incoming: list[dict[str, Any]]) -> None:
        self.incoming = [json.dumps(item) for item in incoming]
        self.sent: list[dict[str, Any]] = []


    def send(self, message: str) -> None:
        self.sent.append(json.loads(message))

    def recv(self, timeout: float | None = None) -> str:
        return self.incoming.pop(0)

    def close(self) -> None:
        return None


def test_websocket_client_performs_home_assistant_handshake_and_command() -> None:
    socket = FakeSocket([
        {"type": "auth_required", "ha_version": "2026.7.4"},
        {"type": "auth_ok", "ha_version": "2026.7.4"},
        {"id": 1, "type": "result", "success": True, "result": [{"id": "area-casa"}]},
    ])

    client = SupervisorWebSocketClient("supervisor-secret", connector=lambda *args, **kwargs: socket)

    assert client.command("config/area_registry/list") == [{"id": "area-casa"}]
    assert socket.sent == [
        {"type": "auth", "access_token": "supervisor-secret"},
        {"id": 1, "type": "config/area_registry/list"},
    ]
    assert [step.phase for step in client.last_trace] == ["connect", "auth", "command"]
    assert all(step.transport == "websocket" for step in client.last_trace)


def test_websocket_auth_failure_is_not_silently_converted_to_empty_result() -> None:
    socket = FakeSocket([
        {"type": "auth_required"},
        {"type": "auth_invalid", "message": "Invalid access token"},
    ])
    client = SupervisorWebSocketClient("supervisor-secret", connector=lambda *args, **kwargs: socket)

    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_websocket_auth_invalid"):
        client.command("config/entity_registry/list")

    assert client.last_trace[-1].code == "websocket_auth_invalid"
    assert "supervisor-secret" not in json.dumps(client.last_trace, default=lambda value: value.__dict__)


def test_websocket_result_errors_are_structured_and_sanitized() -> None:
    socket = FakeSocket([
        {"type": "auth_required"},
        {"type": "auth_ok"},
        {"id": 1, "type": "result", "success": False, "error": {"code": "unknown_command", "message": "secret detail"}},
    ])
    client = SupervisorWebSocketClient("supervisor-secret", connector=lambda *args, **kwargs: socket)

    with pytest.raises(HomeAssistantUnavailable, match="home_assistant_websocket_unknown_command") as caught:
        client.command("config/entity_registry/list")

    assert caught.value.path == "config/entity_registry/list"
    assert "secret detail" not in str(caught.value)


def _run_server(handler):
    server = serve(handler, "127.0.0.1", 0)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


def _stop_server(server, thread) -> None:
    server.shutdown()
    thread.join(timeout=2)
    server.socket.close()


def test_real_websocket_server_contract_round_trip() -> None:
    # The real protocol sends auth_required before the client sends auth.
    def handler(connection) -> None:
        connection.send(json.dumps({"type": "auth_required"}))
        auth = json.loads(connection.recv())
        assert auth == {"type": "auth", "access_token": "supervisor-secret"}
        connection.send(json.dumps({"type": "auth_ok"}))
        command = json.loads(connection.recv())
        assert command == {"id": 1, "type": "states"}
        connection.send(json.dumps({"id": 1, "type": "result", "success": True, "result": [{"state": "on"}]}))

    server, thread = _run_server(handler)
    try:
        port = server.socket.getsockname()[1]
        client = SupervisorWebSocketClient("supervisor-secret", f"ws://127.0.0.1:{port}")
        assert client.command("states") == [{"state": "on"}]
        assert [step.phase for step in client.last_trace] == ["connect", "auth", "command"]
    finally:
        _stop_server(server, thread)


def test_real_websocket_close_during_command_is_classified() -> None:
    def handler(connection) -> None:
        connection.send(json.dumps({"type": "auth_required"}))
        connection.recv()
        connection.send(json.dumps({"type": "auth_ok"}))
        connection.recv()
        connection.close()

    server, thread = _run_server(handler)
    try:
        port = server.socket.getsockname()[1]
        client = SupervisorWebSocketClient("supervisor-secret", f"ws://127.0.0.1:{port}")
        with pytest.raises(HomeAssistantUnavailable, match="home_assistant_websocket_closed"):
            client.command("logbook/get_events")
        assert client.last_trace[-1].code == "websocket_closed"
    finally:
        _stop_server(server, thread)


def test_real_websocket_ignores_unrelated_message_ids() -> None:
    def handler(connection) -> None:
        connection.send(json.dumps({"type": "auth_required"}))
        connection.recv()
        connection.send(json.dumps({"type": "auth_ok"}))
        connection.recv()
        connection.send(json.dumps({"id": 99, "type": "result", "success": True, "result": [{"wrong": True}]}))
        connection.send(json.dumps({"id": 1, "type": "result", "success": True, "result": [{"right": True}]}))

    server, thread = _run_server(handler)
    try:
        port = server.socket.getsockname()[1]
        client = SupervisorWebSocketClient("supervisor-secret", f"ws://127.0.0.1:{port}")
        assert client.command("states") == [{"right": True}]
    finally:
        _stop_server(server, thread)


def test_real_websocket_receive_timeout_is_classified() -> None:
    def handler(connection) -> None:
        connection.send(json.dumps({"type": "auth_required"}))
        connection.recv()
        connection.send(json.dumps({"type": "auth_ok"}))
        connection.recv()
        sleep(0.2)

    server, thread = _run_server(handler)
    try:
        port = server.socket.getsockname()[1]
        client = SupervisorWebSocketClient("supervisor-secret", f"ws://127.0.0.1:{port}", timeout=0.05)
        with pytest.raises(HomeAssistantUnavailable, match="home_assistant_websocket_timeout"):
            client.command("states")
        assert client.last_trace[-1].code == "websocket_timeout"
    finally:
        _stop_server(server, thread)
