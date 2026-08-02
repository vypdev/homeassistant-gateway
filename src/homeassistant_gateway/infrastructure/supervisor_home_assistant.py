from __future__ import annotations

from datetime import UTC, datetime, timedelta
from time import monotonic
from typing import Any
from urllib.parse import quote

from homeassistant_gateway.application.home_assistant import (
    HealthCheck,
    HomeAssistantHealth,
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.infrastructure.home_assistant.client import SupervisorApiClient
from homeassistant_gateway.infrastructure.home_assistant.registry_reader import (
    SupervisorRegistryReader,
)


class SupervisorHomeAssistantClient(SupervisorApiClient, SupervisorRegistryReader, HomeAssistantReadPort):

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

    def _health_error(self, name: str, error: HomeAssistantUnavailable) -> HealthCheck:
        return {"name": name, "status": "error", "latency_ms": 0, "http_status": error.status, "code": error.code}

    def _health_read_check(self, name: str, reader: Any) -> HealthCheck:
        started = monotonic()
        try:
            reader()
        except HomeAssistantUnavailable as error:
            return {"name": name, "status": "error", "latency_ms": max(0, round((monotonic() - started) * 1000)), "http_status": error.status, "code": error.code}
        return {"name": name, "status": "ok", "latency_ms": max(0, round((monotonic() - started) * 1000)), "http_status": 200, "code": None}

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

    def ui_context(self) -> dict[str, str]:
        core = self._get_json("/config", default={})
        if not isinstance(core, dict):
            return {"locale": "en", "theme": "auto"}
        language = str(core.get("language") or core.get("locale") or "en").replace("_", "-").lower()
        theme = str(core.get("theme") or core.get("frontend_theme") or "auto").lower()
        return {"locale": language, "theme": theme if theme in {"light", "dark", "auto"} else "auto"}

    def configuration(self) -> dict[str, Any]:
        config = self._get_json("/config", default={})
        return {
            "core": config,
            "entity_registry": self.extended_read("entity_registry"),
            "area_registry": self.extended_read("areas"),
        }

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
