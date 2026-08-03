from __future__ import annotations

import json
from collections.abc import Callable
from time import monotonic
from typing import Any, Protocol

from websockets.exceptions import ConnectionClosed, WebSocketException
from websockets.sync.client import connect

from homeassistant_gateway.application.development_models import DevelopmentTraceStep
from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable, redact


class WebSocketConnection(Protocol):
    def send(self, message: str) -> None: ...

    def recv(self, timeout: float | None = None) -> str | bytes: ...

    def close(self) -> None: ...


class SupervisorWebSocketClient:
    """Short-lived, read-only Home Assistant WebSocket command client."""

    def __init__(
        self,
        token: str,
        url: str = "ws://supervisor/core/websocket",
        timeout: float = 5.0,
        max_size: int = 2 * 1024 * 1024,
        connector: Callable[..., WebSocketConnection] = connect,
    ) -> None:
        self._token = token
        self._url = url
        self._timeout = timeout
        self._max_size = max_size
        self._connector = connector
        self.last_trace: tuple[DevelopmentTraceStep, ...] = ()

    def command(self, command: str, payload: dict[str, Any] | None = None) -> Any:
        started = monotonic()
        trace: list[DevelopmentTraceStep] = []
        message_id = 1
        try:
            socket = self._connector(
                self._url,
                open_timeout=self._timeout,
                close_timeout=self._timeout,
                max_size=self._max_size,
            )
            try:
                self._receive_auth_required(socket, trace)
                self._send_json(socket, {"type": "auth", "access_token": self._token})
                auth = self._receive_json(socket)
                if auth.get("type") != "auth_ok":
                    trace.append(self._step("auth", "error", started, "websocket_auth_invalid", command))
                    raise HomeAssistantUnavailable("home_assistant_websocket_auth_invalid", path="/core/websocket")
                trace.append(self._step("auth", "ok", started, "websocket_auth_ok", command))
                request = {"id": message_id, "type": command}
                if payload:
                    request.update(payload)
                command_started = monotonic()
                self._send_json(socket, request)
                while True:
                    response = self._receive_json(socket, timeout=self._timeout)
                    if response.get("id") != message_id:
                        continue
                    if response.get("type") == "result" and response.get("success") is True:
                        trace.append(self._step("command", "ok", command_started, "websocket_command_ok", command))
                        self.last_trace = tuple(trace)
                        return redact(response.get("result"))
                    error_value = response.get("error")
                    command_error: dict[str, Any] = error_value if isinstance(error_value, dict) else {}
                    code = str(command_error.get("code") or "websocket_command_failed")
                    trace.append(self._step("command", "error", command_started, code, command))
                    raise HomeAssistantUnavailable(f"home_assistant_websocket_{code}", path=command)
            finally:
                socket.close()
        except HomeAssistantUnavailable:
            self.last_trace = tuple(trace)
            raise
        except (TimeoutError, ConnectionClosed) as error:
            trace.append(self._step("connect", "error", started, "websocket_timeout" if isinstance(error, TimeoutError) else "websocket_closed", command))
            self.last_trace = tuple(trace)
            raise HomeAssistantUnavailable("home_assistant_websocket_timeout" if isinstance(error, TimeoutError) else "home_assistant_websocket_closed", path="/core/websocket") from error
        except (OSError, WebSocketException) as error:
            trace.append(self._step("connect", "error", started, "websocket_connection", command))
            self.last_trace = tuple(trace)
            raise HomeAssistantUnavailable("home_assistant_websocket_connection", path="/core/websocket") from error

    @staticmethod
    def _send_json(socket: WebSocketConnection, message: dict[str, Any]) -> None:
        socket.send(json.dumps(message, separators=(",", ":")))

    @staticmethod
    def _receive_json(socket: WebSocketConnection, timeout: float | None = None) -> dict[str, Any]:
        try:
            raw = socket.recv(timeout=timeout)
        except TypeError:
            # Keep lightweight injected test transports compatible with the port.
            raw = socket.recv()
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            value = json.loads(raw)
        except (TypeError, json.JSONDecodeError) as error:
            raise HomeAssistantUnavailable("home_assistant_websocket_invalid_json", path="/core/websocket") from error
        if not isinstance(value, dict):
            raise HomeAssistantUnavailable("home_assistant_websocket_invalid_message", path="/core/websocket")
        return value

    def _receive_auth_required(self, socket: WebSocketConnection, trace: list[DevelopmentTraceStep]) -> None:
        message = self._receive_json(socket, timeout=self._timeout)
        if message.get("type") != "auth_required":
            trace.append(self._step("auth", "error", monotonic(), "websocket_auth_required_missing", "auth"))
            raise HomeAssistantUnavailable("home_assistant_websocket_auth_required_missing", path="/core/websocket")
        trace.append(self._step("connect", "ok", monotonic(), "websocket_connected", "auth"))

    @staticmethod
    def _step(phase: str, status: str, started: float, code: str, command: str) -> DevelopmentTraceStep:
        return DevelopmentTraceStep(
            phase=phase,
            transport="websocket",
            status=status,
            duration_ms=max(0, round((monotonic() - started) * 1000)),
            command=command,
            path="/core/websocket",
            code=code,
            detail=code,
        )
