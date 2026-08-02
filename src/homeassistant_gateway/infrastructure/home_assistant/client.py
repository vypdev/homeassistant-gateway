from __future__ import annotations

import json
from time import sleep
from typing import Any

import httpx

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable, redact


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
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._max_items = max_items
        self._transport = transport

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
        try:
            payload = json.loads(response.text)
        except json.JSONDecodeError as error:
            raise HomeAssistantUnavailable("home_assistant_invalid_json", path="/template", status=response.status_code) from error
        return payload if isinstance(payload, list) else []
