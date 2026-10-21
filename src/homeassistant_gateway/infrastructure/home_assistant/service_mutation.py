from __future__ import annotations

import json
import re
from collections.abc import Callable, Collection, Mapping
from typing import Any, Protocol

from homeassistant_gateway.application.home_assistant import (
    HomeAssistantServiceMutationPort,
    HomeAssistantUnavailable,
    redact,
)


class ServicePostTransport(Protocol):
    def post_json(
        self,
        path: str,
        payload: dict[str, Any],
        params: Mapping[str, str] | None = None,
        response_limit: int | None = None,
    ) -> tuple[int, Any]: ...


TODO_RESPONSE_MAX_ITEMS = 10_000
TODO_RESPONSE_MAX_BYTES = 2 * 1024 * 1024
TODO_RESPONSE_MAX_FIELD_SIZE = 100_000
_TODO_ENTITY_RE = re.compile(r"todo\.[a-z0-9_]+")
_TODO_STATUS_VALUES = frozenset({"needs_action", "completed"})
_TODO_ITEM_FIELDS = frozenset({"summary", "uid", "status", "due", "description", "completed"})


class SupervisorServiceMutationAdapter(HomeAssistantServiceMutationPort):
    """Bounded, allowlisted Home Assistant service-call adapter."""

    def __init__(
        self,
        transport: ServicePostTransport,
        allowed_services: Collection[str] | Callable[[], Collection[str]] = (),
        max_payload_keys: int = 50,
        max_response_items: int = TODO_RESPONSE_MAX_ITEMS,
        max_response_bytes: int = TODO_RESPONSE_MAX_BYTES,
        max_response_field_size: int = TODO_RESPONSE_MAX_FIELD_SIZE,
    ) -> None:
        if max_payload_keys < 1 or max_payload_keys > 200:
            raise ValueError("invalid_mutation_payload_limit")
        if max_response_items < 1 or max_response_items > TODO_RESPONSE_MAX_ITEMS:
            raise ValueError("invalid_service_response_item_limit")
        if max_response_bytes < 1 or max_response_bytes > 2 * 1024 * 1024:
            raise ValueError("invalid_service_response_size_limit")
        if max_response_field_size < 1 or max_response_field_size > TODO_RESPONSE_MAX_FIELD_SIZE:
            raise ValueError("invalid_service_response_field_limit")
        self._transport = transport
        self._allowed_services = allowed_services
        self._max_payload_keys = max_payload_keys
        self._max_response_items = max_response_items
        self._max_response_bytes = max_response_bytes
        self._max_response_field_size = max_response_field_size

    def call_service(self, domain: str, service: str, payload: dict[str, Any]) -> list[dict[str, Any]] | dict[str, Any]:
        operation = f"{domain}.{service}"
        if not re.fullmatch(r"[a-z0-9_]+", domain) or not re.fullmatch(r"[a-z0-9_]+", service):
            raise ValueError("invalid_service_name")
        allowed_services = self._allowed_services() if callable(self._allowed_services) else self._allowed_services
        if operation not in allowed_services:
            raise PermissionError("service_not_allowlisted")
        if not isinstance(payload, dict) or len(payload) > self._max_payload_keys:
            raise ValueError("service_payload_too_large")
        response_service = operation == "todo.get_items"
        if response_service:
            self._validate_todo_request(payload)
        path = f"/services/{domain}/{service}"
        try:
            if response_service:
                status, response = self._transport.post_json(
                    path,
                    payload,
                    {"return_response": "true"},
                    response_limit=self._max_response_bytes,
                )
            else:
                status, response = self._transport.post_json(path, payload, None)
        except HomeAssistantUnavailable as error:
            if response_service and error.code in {
                "home_assistant_invalid_json",
                "home_assistant_response_too_large",
            }:
                raise self._invalid_response(path, error.status) from error
            raise
        if status >= 400:
            raise HomeAssistantUnavailable(f"home_assistant_http_{status}", path=path, status=status)
        if response_service:
            self._validate_todo_response(payload["entity_id"], response, path, status)
        elif not isinstance(response, list) or not all(isinstance(item, dict) for item in response):
            raise self._invalid_response(path, status)
        return redact(response)

    def _validate_todo_request(self, payload: dict[str, Any]) -> None:
        if set(payload) - {"entity_id", "status"}:
            raise ValueError("todo_entity_target_invalid")
        entity_id = payload.get("entity_id")
        if not isinstance(entity_id, str) or _TODO_ENTITY_RE.fullmatch(entity_id) is None:
            raise ValueError("todo_entity_target_invalid")
        if "status" not in payload:
            return
        status = payload["status"]
        statuses = [status] if isinstance(status, str) else status
        if (
            not isinstance(statuses, list)
            or not statuses
            or len(statuses) > 2
            or not all(isinstance(item, str) and item in _TODO_STATUS_VALUES for item in statuses)
        ):
            raise ValueError("todo_request_invalid")

    def _validate_todo_response(self, entity_id: str, response: Any, path: str, status: int) -> None:
        if not isinstance(response, Mapping) or len(response) != 1:
            raise self._invalid_response(path, status)
        keys = tuple(response.keys())
        if keys != (entity_id,):
            raise self._invalid_response(path, status)
        data = response[entity_id]
        if not isinstance(data, Mapping) or tuple(data) != ("items",):
            raise self._invalid_response(path, status)
        items = data["items"]
        if not isinstance(items, list) or len(items) > self._max_response_items:
            raise self._invalid_response(path, status)
        for item in items:
            if not isinstance(item, Mapping) or not self._valid_todo_item(item):
                raise self._invalid_response(path, status)
        try:
            serialized = json.dumps(response, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
        except (TypeError, ValueError, OverflowError) as error:
            raise self._invalid_response(path, status) from error
        if len(serialized.encode("utf-8")) > self._max_response_bytes:
            raise self._invalid_response(path, status)

    def _valid_todo_item(self, item: Mapping[Any, Any]) -> bool:
        for key, value in item.items():
            if not isinstance(key, str) or key not in _TODO_ITEM_FIELDS:
                return False
            if value is not None and (not isinstance(value, str) or len(value) > self._max_response_field_size):
                return False
        return True

    @staticmethod
    def _invalid_response(path: str, status: int | None) -> HomeAssistantUnavailable:
        return HomeAssistantUnavailable("home_assistant_invalid_service_response", path=path, status=status)


class SupervisorOperatorMutationAdapter:
    """Translate the supported operator operation into the service-call port."""

    def __init__(self, service_port: HomeAssistantServiceMutationPort) -> None:
        self._service_port = service_port

    def execute(self, operation: str, target: str, proposed: dict[str, Any]) -> dict[str, Any]:
        if operation not in {"ha.call_service", "ha.update_automation"}:
            return {"status": "unsupported", "reason": "operator_operation_not_connected"}
        entity_id = proposed.get("entity_id")
        service_domain = target.split(".", 1)[0] if "." in target else ""
        requires_entity = service_domain != "shopping_list"
        if requires_entity and (not isinstance(entity_id, str) or not re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity_id)):
            raise ValueError("service_entity_target_invalid")
        if operation == "ha.update_automation":
            if not isinstance(entity_id, str) or not re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity_id):
                raise ValueError("automation_entity_target_invalid")
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
