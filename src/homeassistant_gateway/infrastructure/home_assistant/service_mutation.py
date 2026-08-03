from __future__ import annotations

import re
from typing import Any, Protocol

from homeassistant_gateway.application.home_assistant import (
    HomeAssistantServiceMutationPort,
    HomeAssistantUnavailable,
    redact,
)


class ServicePostTransport(Protocol):
    def post_json(self, path: str, payload: dict[str, Any]) -> tuple[int, Any]: ...


class SupervisorServiceMutationAdapter(HomeAssistantServiceMutationPort):
    """Bounded, allowlisted Home Assistant service-call adapter."""

    def __init__(self, transport: ServicePostTransport, allowed_services: frozenset[str] = frozenset(), max_payload_keys: int = 50) -> None:
        if max_payload_keys < 1 or max_payload_keys > 200:
            raise ValueError("invalid_mutation_payload_limit")
        self._transport = transport
        self._allowed_services = allowed_services
        self._max_payload_keys = max_payload_keys

    def call_service(self, domain: str, service: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        operation = f"{domain}.{service}"
        if not re.fullmatch(r"[a-z0-9_]+", domain) or not re.fullmatch(r"[a-z0-9_]+", service):
            raise ValueError("invalid_service_name")
        if operation not in self._allowed_services:
            raise PermissionError("service_not_allowlisted")
        if not isinstance(payload, dict) or len(payload) > self._max_payload_keys:
            raise ValueError("service_payload_too_large")
        status, response = self._transport.post_json(f"/services/{domain}/{service}", payload)
        if status >= 400:
            raise HomeAssistantUnavailable(f"home_assistant_http_{status}", path=f"/services/{domain}/{service}", status=status)
        if not isinstance(response, list) or not all(isinstance(item, dict) for item in response):
            raise HomeAssistantUnavailable("home_assistant_invalid_service_response", path=f"/services/{domain}/{service}", status=status)
        return redact(response)


class SupervisorOperatorMutationAdapter:
    """Translate the supported operator operation into the service-call port."""

    def __init__(self, service_port: HomeAssistantServiceMutationPort) -> None:
        self._service_port = service_port

    def execute(self, operation: str, target: str, proposed: dict[str, Any]) -> dict[str, Any]:
        if operation not in {"ha.call_service", "ha.update_automation"}:
            return {"status": "unsupported", "reason": "operator_operation_not_connected"}
        entity_id = proposed.get("entity_id")
        if not isinstance(entity_id, str) or not re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity_id):
            raise ValueError("service_entity_target_invalid")
        if operation == "ha.update_automation":
            if not entity_id.startswith("automation."):
                raise ValueError("automation_entity_target_invalid")
            action = proposed.get("action")
            if action not in {"trigger", "turn_on", "turn_off"}:
                raise ValueError("automation_action_invalid")
            domain, service = "automation", action
            target = f"{domain}.{service}"
        else:
            if "." not in target:
                raise ValueError("service_target_invalid")
            domain, service = target.split(".", 1)
        payload = dict(proposed)
        payload.pop("action", None)
        return {
            "status": "ok",
            "operation": operation,
            "target": target,
            "data": self._service_port.call_service(domain, service, payload),
        }
