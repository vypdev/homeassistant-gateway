from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from time import monotonic
from typing import Any

from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)


@dataclass(frozen=True)
class DevelopmentOperation:
    name: str
    label: str
    description: str
    kind: str = "read"
    supports_entity_id: bool = False
    supports_start_time: bool = False


@dataclass(frozen=True)
class DevelopmentResult:
    status: str
    operation: str
    duration_ms: int
    count: int
    data: Any = None
    reason: str | None = None


def development_catalog() -> tuple[DevelopmentOperation, ...]:
    return (
        DevelopmentOperation("inventory", "Entity inventory", "All bounded entities, services and counts."),
        DevelopmentOperation("states", "Entity states", "Current state and attributes, optionally scoped to one entity.", supports_entity_id=True),
        DevelopmentOperation("automations", "Automations", "Automation entities and their current applied state."),
        DevelopmentOperation("configuration", "Configuration and registries", "Core configuration plus entity and area registries."),
        DevelopmentOperation("services", "Service catalog", "Available service domains and service schemas."),
        DevelopmentOperation("events", "Event catalog", "Available event types exposed by Home Assistant."),
        DevelopmentOperation("history", "History", "State history, optionally scoped to entity and start time.", supports_entity_id=True, supports_start_time=True),
        DevelopmentOperation("logbook", "Logbook", "Human-readable state/activity records, optionally scoped to entity and start time.", supports_entity_id=True, supports_start_time=True),
        DevelopmentOperation("devices", "Device registry", "Registered devices."),
        DevelopmentOperation("areas", "Area registry", "Registered areas."),
        DevelopmentOperation("floors", "Floor registry", "Registered floors."),
        DevelopmentOperation("labels", "Label registry", "Registered labels."),
        DevelopmentOperation("entity_registry", "Entity registry", "Registered entities and metadata."),
        DevelopmentOperation("scripts", "Scripts", "Script entities derived from current states."),
        DevelopmentOperation("scenes", "Scenes", "Scene entities derived from current states."),
        DevelopmentOperation("helpers", "Helpers", "Input helpers derived from current states."),
        DevelopmentOperation("integrations", "Integrations", "Integration domains derived from entity states."),
    )


@dataclass(frozen=True)
class DevelopmentPack:
    name: str
    label: str
    description: str
    operations: tuple[str, ...]


def development_packs() -> tuple[DevelopmentPack, ...]:
    return (
        DevelopmentPack("basic_inventory", "Basic inventory", "Core read model and registries.", ("inventory", "states", "devices", "areas", "floors", "labels", "entity_registry")),
        DevelopmentPack("automation_diagnostics", "Automation diagnostics", "Automations and related state/activity data.", ("automations", "scripts", "scenes", "helpers", "history", "logbook")),
        DevelopmentPack("mcp_readiness", "MCP readiness", "Resources required by observer clients.", ("inventory", "services", "events", "configuration", "automations")),
        DevelopmentPack("data_completeness", "Data completeness", "Extended read model coverage and explicit endpoint failures.", tuple(item.name for item in development_catalog())),
    )


class DevelopmentToolRunner:
    def __init__(self, home_assistant: HomeAssistantReadPort) -> None:
        self._home_assistant = home_assistant
        self._operations: dict[str, Callable[..., Any]] = {
            "inventory": home_assistant.inventory,
            "states": home_assistant.states,
            "automations": home_assistant.automations,
            "configuration": home_assistant.configuration,
            "services": home_assistant.services,
            "events": home_assistant.events,
            "history": home_assistant.history,
            "logbook": home_assistant.logbook,
            **{operation.name: (lambda resource=operation.name: home_assistant.extended_read(resource)) for operation in development_catalog() if operation.name not in {"inventory", "states", "automations", "configuration", "services", "events", "history", "logbook"}},
        }

    def run(self, operation: str, parameters: dict[str, Any]) -> DevelopmentResult:
        definition = next((item for item in development_catalog() if item.name == operation), None)
        if definition is None:
            raise ValueError("unknown_development_operation")
        safe_parameters = self._validate_parameters(definition, parameters)
        started = monotonic()
        data = self._operations[operation](**safe_parameters)
        duration_ms = max(0, round((monotonic() - started) * 1000))
        return DevelopmentResult(
            status="ok",
            operation=operation,
            duration_ms=duration_ms,
            count=self._count(data),
            data=data,
        )

    def run_all(self) -> tuple[DevelopmentResult, ...]:
        return self.run_operations(tuple(item.name for item in development_catalog()))

    def run_pack(self, pack: str) -> tuple[DevelopmentResult, ...]:
        definition = next((item for item in development_packs() if item.name == pack), None)
        if definition is None:
            raise ValueError("unknown_development_pack")
        return self.run_operations(definition.operations)

    def run_operations(self, operations: tuple[str, ...]) -> tuple[DevelopmentResult, ...]:
        results: list[DevelopmentResult] = []
        for operation in operations:
            try:
                results.append(self.run(operation, {}))
            except (HomeAssistantUnavailable, ValueError) as error:
                results.append(
                    DevelopmentResult(
                        status="error",
                        operation=operation,
                        duration_ms=0,
                        count=0,
                        reason=type(error).__name__,
                    )
                )
        return tuple(results)

    @staticmethod
    def _validate_parameters(definition: DevelopmentOperation, parameters: dict[str, Any]) -> dict[str, Any]:
        allowed = set()
        if definition.supports_entity_id:
            allowed.add("entity_id")
        if definition.supports_start_time:
            allowed.add("start_time")
        unknown = set(parameters) - allowed
        if unknown:
            raise ValueError("unsupported_development_parameter")
        return {key: value for key, value in parameters.items() if value not in (None, "")}

    @staticmethod
    def _count(data: Any) -> int:
        if isinstance(data, list):
            return len(data)
        if isinstance(data, dict):
            counts = data.get("counts")
            if isinstance(counts, dict):
                return sum(value for value in counts.values() if isinstance(value, int))
            return len(data)
        return 1
