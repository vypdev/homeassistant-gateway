from __future__ import annotations

from datetime import UTC, datetime, timedelta
from time import monotonic, sleep
from typing import Any
from urllib.parse import quote

import httpx

from homeassistant_gateway.application.home_assistant import (
    HealthCheck,
    HomeAssistantHealth,
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
    redact,
)


class SupervisorHomeAssistantClient(HomeAssistantReadPort):
    """Bounded read-only adapter for Home Assistant's Supervisor-provided API."""

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
        self._headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._max_items = max_items
        self._transport = transport

    def health(self) -> bool:
        try:
            response = self._request("/config")
        except HomeAssistantUnavailable:
            return False
        return response.status_code < 400

    def health_details(self) -> HomeAssistantHealth:
        checks = [
            self._health_check("core", "/config"),
            self._health_check("states", "/states"),
            self._health_check("services", "/services"),
            self._health_check("events", "/events"),
            self._health_check("recorder", "/history/period", {"start_time": (datetime.now(UTC) - timedelta(hours=1)).isoformat()}),
            self._health_check("logbook", "/logbook", {"start_time": (datetime.now(UTC) - timedelta(hours=1)).isoformat()}),
        ]
        core = next(item for item in checks if item["name"] == "core")
        status = "ready" if all(item["status"] == "ok" for item in checks) else ("degraded" if core["status"] == "ok" else "unavailable")
        return {"status": status, "checks": checks}

    def _health_check(self, name: str, path: str, params: dict[str, str] | None = None) -> HealthCheck:
        started = monotonic()
        try:
            response = self._request(path, params=params)
            code = None if response.status_code < 400 else f"home_assistant_http_{response.status_code}"
            status = "ok" if response.status_code < 400 else "error"
            http_status = response.status_code
        except HomeAssistantUnavailable as error:
            code = error.code
            status = "error"
            http_status = error.status
        return {"name": name, "status": status, "latency_ms": max(0, round((monotonic() - started) * 1000)), "http_status": http_status, "code": code}

    def inventory(self) -> dict[str, Any]:
        states = self.states()
        services = self._get_json("/services", default=[])
        return {
            "entities": states,
            "services": self._bounded_list(services),
            "counts": {"entities": len(states), "services": len(services) if isinstance(services, list) else 0},
        }

    def states(self, entity_id: str | None = None) -> list[dict[str, Any]]:
        path = f"/states/{entity_id}" if entity_id else "/states"
        payload = self._get_json(path, default=[])
        if entity_id:
            payload = [payload] if isinstance(payload, dict) else []
        return self._bounded_list(payload)

    def automations(self) -> list[dict[str, Any]]:
        # The stable REST contract exposes automation entities through /states.
        return [item for item in self.states() if str(item.get("entity_id", "")).startswith("automation.")]

    def services(self) -> list[dict[str, Any]]:
        return self._bounded_list(self._get_json("/services", default=[]))

    def events(self) -> list[dict[str, Any]]:
        return self._bounded_list(self._get_json("/events", default=[]))

    def history(self, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]:
        entity = entity_id or self._probe_entity("history")
        start = start_time or self._timestamp(datetime.now(UTC) - timedelta(days=1))
        params = {"filter_entity_id": entity}
        payload = self._get_json(f"/history/period/{quote(start, safe='')}", default=[], params=params, diagnostic_path="/history/period")
        if not isinstance(payload, list):
            return []
        groups: list[dict[str, Any]] = []
        for group in payload[: self._max_items]:
            if not isinstance(group, list):
                continue
            states = [item for item in group[: self._max_items] if isinstance(item, dict)]
            if states:
                groups.append({"entity_id": states[0].get("entity_id"), "states": states})
        return groups

    def logbook(self, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]:
        entity = entity_id or self._probe_entity("logbook")
        start = start_time or self._timestamp(datetime.now(UTC) - timedelta(days=1))
        params = {"entity": entity}
        return self._bounded_list(self._get_json(f"/logbook/{quote(start, safe='')}", default=[], params=params, diagnostic_path="/logbook"))

    def extended_read(self, resource: str) -> list[dict[str, Any]]:
        registry_paths = {
            "devices": "/config/device_registry/list",
            "areas": "/config/area_registry/list",
            "floors": "/config/floor_registry/list",
            "labels": "/config/label_registry/list",
            "entity_registry": "/config/entity_registry/list",
        }
        if resource in registry_paths:
            return self._bounded_list(self._get_json(registry_paths[resource], default=[], allow_not_found=True))
        states = self.states()
        prefixes = {"scripts": ("script.",), "scenes": ("scene.",), "helpers": ("input_",)}
        if resource in prefixes:
            return [item for item in states if str(item.get("entity_id", "")).startswith(prefixes[resource])]
        if resource == "integrations":
            domains = sorted({str(item.get("entity_id", "")).split(".", 1)[0] for item in states if "." in str(item.get("entity_id", ""))})
            return [{"domain": domain} for domain in domains]
        raise ValueError("unknown_extended_resource")

    def ui_context(self) -> dict[str, str]:
        core = self.configuration().get("core", {})
        if not isinstance(core, dict):
            return {"locale": "en", "theme": "auto"}
        language = str(core.get("language") or core.get("locale") or "en").replace("_", "-").lower()
        theme = str(core.get("theme") or core.get("frontend_theme") or "auto").lower()
        return {"locale": language, "theme": theme if theme in {"light", "dark", "auto"} else "auto"}

    def configuration(self) -> dict[str, Any]:
        config = self._get_json("/config", default={})
        return {"core": config, "entity_registry": self._get_json("/config/entity_registry/list", default=[], allow_not_found=True), "area_registry": self._get_json("/config/area_registry/list", default=[], allow_not_found=True)}

    def _get_json(self, path: str, default: Any, params: dict[str, str] | None = None, allow_not_found: bool = False, diagnostic_path: str | None = None) -> Any:
        response = self._request(path, params=params)
        safe_path = diagnostic_path or path
        if response.status_code == 404:
            if allow_not_found:
                return default
            raise HomeAssistantUnavailable("home_assistant_http_404", path=safe_path, status=404, params=tuple(sorted(params or {})))
        if response.status_code >= 400:
            raise HomeAssistantUnavailable(f"home_assistant_http_{response.status_code}", path=safe_path, status=response.status_code, params=tuple(sorted(params or {})))
        try:
            return redact(response.json())
        except ValueError as error:
            raise HomeAssistantUnavailable("home_assistant_invalid_json", path=path, status=response.status_code) from error

    def _request(self, path: str, params: dict[str, str] | None = None) -> httpx.Response:
        for attempt in range(2):
            try:
                with httpx.Client(headers=self._headers, timeout=self._timeout, trust_env=False, transport=self._transport) as client:
                    return client.get(f"{self._base_url}{path}", params=params)
            except httpx.HTTPError as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_unavailable") from error
                sleep(0.05)
        raise AssertionError("unreachable")

    def _probe_entity(self, operation: str) -> str:
        for item in self.states():
            entity_id = item.get("entity_id")
            if isinstance(entity_id, str) and "." in entity_id:
                return entity_id
        raise HomeAssistantUnavailable(f"{operation}_entity_required", path=f"/{operation}")

    @staticmethod
    def _timestamp(value: datetime) -> str:
        return value.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    def _bounded_list(self, value: Any) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        return [item for item in value[: self._max_items] if isinstance(item, dict)]
