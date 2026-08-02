from __future__ import annotations

import json
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
        if max_items < 1 or max_items > 10000:
            raise ValueError("invalid_supervisor_max_items")
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

    def extended_read(self, resource: str) -> list[dict[str, Any]]:
        registry_paths = {
            "devices": "/config/device_registry/list",
            "areas": "/config/area_registry/list",
            "floors": "/config/floor_registry/list",
            "labels": "/config/label_registry/list",
            "entity_registry": "/config/entity_registry/list",
        }
        if resource in registry_paths:
            try:
                payload = self._get_json(registry_paths[resource], default=[], allow_not_found=False)
            except HomeAssistantUnavailable as error:
                if error.status != 404:
                    raise
                payload = self._template_registry(resource)
            return self._bounded_list(payload)
        states = self.states()
        prefixes = {"scripts": ("script.",), "scenes": ("scene.",), "helpers": ("input_",)}
        if resource in prefixes:
            return [item for item in states if str(item.get("entity_id", "")).startswith(prefixes[resource])]
        if resource == "integrations":
            domains = sorted({str(item.get("entity_id", "")).split(".", 1)[0] for item in states if "." in str(item.get("entity_id", ""))})
            return [{"domain": domain} for domain in domains]
        raise ValueError("unknown_extended_resource")

    def _template_registry(self, resource: str) -> list[dict[str, Any]]:
        templates = {
            "areas": "{% set ns = namespace(items=[]) %}{% for id in areas() %}{% set ns.items = ns.items + [{'id': id, 'name': area_name(id), 'entities': area_entities(id), 'devices': area_devices(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "floors": "{% set ns = namespace(items=[]) %}{% for id in floors() %}{% set ns.items = ns.items + [{'id': id, 'name': floor_name(id), 'areas': floor_areas(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "labels": "{% set ns = namespace(items=[]) %}{% for id in labels() %}{% set ns.items = ns.items + [{'id': id, 'name': label_name(id), 'entities': label_entities(id), 'devices': label_devices(id), 'areas': label_areas(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "devices": "{% set ns = namespace(ids=[]) %}{% for item in states %}{% set id = device_id(item.entity_id) %}{% if id and id not in ns.ids %}{% set ns.ids = ns.ids + [id] %}{% endif %}{% endfor %}{% set ns.items = [] %}{% for id in ns.ids %}{% set ns.items = ns.items + [{'id': id, 'name': device_attr(id, 'name'), 'manufacturer': device_attr(id, 'manufacturer'), 'model': device_attr(id, 'model'), 'area_id': device_attr(id, 'area_id'), 'entities': device_entities(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "entity_registry": "{% set ns = namespace(items=[]) %}{% for item in states %}{% set ns.items = ns.items + [{'entity_id': item.entity_id, 'state': item.state, 'attributes': item.attributes, 'device_id': device_id(item.entity_id), 'area_id': area_id(item.entity_id)}] %}{% endfor %}{{ ns.items | tojson }}",
        }
        return self._post_template(templates[resource])

    def _post_template(self, template: str) -> list[dict[str, Any]]:
        response = self._request_post("/template", {"template": template}, diagnostic_path="/template")
        try:
            payload = json.loads(response.text)
        except json.JSONDecodeError as error:
            raise HomeAssistantUnavailable("home_assistant_invalid_json", path="/template", status=response.status_code) from error
        return payload if isinstance(payload, list) else []

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

    def _get_json(self, path: str, default: Any, params: dict[str, str] | None = None, allow_not_found: bool = False, diagnostic_path: str | None = None) -> Any:
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
                sleep(0.05)
            except httpx.ConnectError as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_connection", path=request_path, params=request_params) from error
                sleep(0.05)
            except httpx.NetworkError as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_network", path=request_path, params=request_params) from error
                sleep(0.05)
            except httpx.HTTPError as error:
                if attempt == 1:
                    raise HomeAssistantUnavailable("home_assistant_transport_unavailable", path=request_path, params=request_params) from error
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
