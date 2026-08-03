from __future__ import annotations

from time import monotonic
from typing import Any

from homeassistant_gateway.application.home_assistant import (
    HealthCheck,
    HomeAssistantHealth,
    HomeAssistantUnavailable,
)


class SupervisorCoreReader:
    """Read core configuration and bounded health information."""

    def health(self: Any) -> bool:
        try:
            response = self._request("/config")
        except HomeAssistantUnavailable:
            return False
        return response.status_code < 400

    def health_details(self: Any) -> HomeAssistantHealth:
        checks = [
            self._health_check("core", "/config"),
            self._health_check("states", "/states"),
            self._health_check("services", "/services"),
            self._health_check("events", "/events"),
        ]
        try:
            entity = self._probe_entity("health")
        except HomeAssistantUnavailable as error:
            checks.extend([self._health_error("recorder", error), self._health_error("logbook", error)])
        else:
            checks.extend([
                self._health_read_check("recorder", lambda: self.history(entity)),
                self._health_read_check("logbook", lambda: self.logbook(entity)),
            ])
        core = next(item for item in checks if item["name"] == "core")
        status = "ready" if all(item["status"] == "ok" for item in checks) else ("degraded" if core["status"] == "ok" else "unavailable")
        return {"status": status, "checks": checks}

    def _health_check(self: Any, name: str, path: str, params: dict[str, str] | None = None) -> HealthCheck:
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

    def _health_error(self: Any, name: str, error: HomeAssistantUnavailable) -> HealthCheck:
        return {"name": name, "status": "error", "latency_ms": 0, "http_status": error.status, "code": error.code}

    def _health_read_check(self: Any, name: str, reader: Any) -> HealthCheck:
        started = monotonic()
        try:
            reader()
        except HomeAssistantUnavailable as error:
            return {"name": name, "status": "error", "latency_ms": max(0, round((monotonic() - started) * 1000)), "http_status": error.status, "code": error.code}
        return {"name": name, "status": "ok", "latency_ms": max(0, round((monotonic() - started) * 1000)), "http_status": 200, "code": None}

    def ui_context(self: Any) -> dict[str, str]:
        try:
            core = self._ws_command("get_config")
        except HomeAssistantUnavailable as error:
            if not self._is_websocket_fallback_allowed(error):
                raise
            core = self._get_json("/config", default={})
        if not isinstance(core, dict):
            return {"locale": "en", "theme": "auto"}
        language = str(core.get("language") or core.get("locale") or "en").replace("_", "-").lower()
        theme = str(core.get("theme") or core.get("frontend_theme") or "auto").lower()
        return {"locale": language, "theme": theme if theme in {"light", "dark", "auto"} else "auto"}

    def configuration(self: Any) -> dict[str, Any]:
        try:
            config = self._ws_command("get_config")
        except HomeAssistantUnavailable as error:
            if not self._is_websocket_fallback_allowed(error):
                raise
            config = self._get_json("/config", default={})
        return {
            "core": config,
            "entity_registry": self.extended_read("entity_registry"),
            "area_registry": self.extended_read("areas"),
        }
