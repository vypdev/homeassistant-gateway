from __future__ import annotations

import json
from time import sleep
from typing import Any

import httpx

from homeassistant_gateway.application.development_models import DevelopmentTraceStep
from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable, redact
from homeassistant_gateway.infrastructure.home_assistant.websocket_client import (
    SupervisorWebSocketClient,
)


class SupervisorApiClient:
    """Bounded, redacted HTTP transport for Supervisor's Home Assistant API."""

    def __init__(
        self,
        token: str,
        base_url: str = "http://supervisor/core/api",
        timeout: float = 5.0,
        max_items: int = 5000,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not token:
            raise ValueError("supervisor_token_required")
        if timeout <= 0 or timeout > 30:
            raise ValueError("invalid_supervisor_timeout")
        if max_items < 1 or max_items > 10000:
            raise ValueError("invalid_supervisor_max_items")
        self._headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        self._token = token
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._max_items = max_items
        self._transport = transport
        self._websocket = None if transport is not None else SupervisorWebSocketClient(token, self._websocket_url(self._base_url), timeout=timeout)
        self.last_trace: tuple[DevelopmentTraceStep, ...] = ()
        self._fallback_active = False

    def begin_trace(self) -> None:
        self.last_trace = ()
        self._fallback_active = False

    @staticmethod
    def _websocket_url(base_url: str) -> str:
        if base_url.startswith("https://"):
            prefix = "wss://" + base_url[len("https://"):]
            return prefix.removesuffix("/api") + "/websocket" if "/core/api" in prefix else prefix + "/websocket"
        if base_url.startswith("http://"):
            prefix = "ws://" + base_url[len("http://"):]
            return prefix.removesuffix("/api") + "/websocket" if "/core/api" in prefix else prefix + "/websocket"
        return base_url.removesuffix("/api") + "/websocket"

    def _ws_command(self, command: str, payload: dict[str, Any] | None = None) -> Any:
        if self._websocket is None:
            self.last_trace = (DevelopmentTraceStep(
                phase="connect",
                transport="websocket",
                status="error",
                duration_ms=0,
                path="/core/websocket",
                code="websocket_connection",
                detail="websocket_transport_unavailable",
            ),)
            self._fallback_active = True
            raise HomeAssistantUnavailable("home_assistant_websocket_connection", path="/core/websocket")
        try:
            return self._websocket.command(command, payload)
        except HomeAssistantUnavailable:
            self._fallback_active = True
            raise
        finally:
            self.last_trace = self._websocket.last_trace

    def _get_json(
        self,
        path: str,
        default: Any,
        params: dict[str, str] | None = None,
        allow_not_found: bool = False,
        diagnostic_path: str | None = None,
    ) -> Any:
        safe_path = diagnostic_path or path
        response = self._request(path, params=params, diagnostic_path=safe_path)
        self._record_transport_step("fallback" if self._fallback_active else "command", "rest", safe_path)
        if response.status_code == 404:
            if allow_not_found:
                return default
            raise HomeAssistantUnavailable("home_assistant_http_404", path=safe_path, status=404, params=tuple(sorted(params or {})))
        if response.status_code >= 400:
            raise HomeAssistantUnavailable(f"home_assistant_http_{response.status_code}", path=safe_path, status=response.status_code, params=tuple(sorted(params or {})))
        try:
            return redact(response.json())
        except ValueError as error:
            raise HomeAssistantUnavailable("home_assistant_invalid_json", path=safe_path, status=response.status_code) from error

    def _request_post(self, path: str, payload: dict[str, Any], diagnostic_path: str | None = None) -> httpx.Response:
        request_path = diagnostic_path or path
        try:
            with httpx.Client(headers=self._headers, timeout=self._timeout, trust_env=False, transport=self._transport) as client:
                response = client.post(f"{self._base_url}{path}", json=payload)
        except httpx.ReadTimeout as error:
            raise HomeAssistantUnavailable("home_assistant_transport_timeout", path=request_path) from error
        except httpx.NetworkError as error:
            raise HomeAssistantUnavailable("home_assistant_transport_network", path=request_path) from error
        except httpx.HTTPError as error:
            raise HomeAssistantUnavailable("home_assistant_transport_unavailable", path=request_path) from error
        if response.status_code >= 400:
            raise HomeAssistantUnavailable(f"home_assistant_http_{response.status_code}", path=request_path, status=response.status_code)
        return response

    def _request(self, path: str, params: dict[str, str] | None = None, diagnostic_path: str | None = None) -> httpx.Response:
        request_path = diagnostic_path or path
        request_params = tuple(sorted(params or {}))
        for attempt in range(2):
            try:
                with httpx.Client(headers=self._headers, timeout=self._timeout, trust_env=False, transport=self._transport) as client:
                    return client.get(f"{self._base_url}{path}", params=params)
            except httpx.ReadTimeout as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_timeout", path=request_path, params=request_params) from error
            except httpx.ConnectError as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_connection", path=request_path, params=request_params) from error
            except httpx.NetworkError as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_network", path=request_path, params=request_params) from error
            except httpx.HTTPError as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_unavailable", path=request_path, params=request_params) from error
            sleep(0.05)
        raise AssertionError("unreachable")

    def _post_template(self, template: str) -> list[dict[str, Any]]:
        response = self._request_post("/template", {"template": template}, diagnostic_path="/template")
        self._record_transport_step("fallback" if self._fallback_active else "command", "template", "/template")
        try:
            payload = json.loads(response.text)
        except json.JSONDecodeError as error:
            raise HomeAssistantUnavailable("home_assistant_invalid_json", path="/template", status=response.status_code) from error
        return payload if isinstance(payload, list) else []

    def _record_transport_step(self, phase: str, transport: str, path: str) -> None:
        self.last_trace = (*self.last_trace, DevelopmentTraceStep(
            phase=phase,
            transport=transport,
            status="ok",
            duration_ms=0,
            path=path,
            detail=f"{transport}_response_received",
        ))
