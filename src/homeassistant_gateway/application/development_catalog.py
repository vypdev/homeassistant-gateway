from __future__ import annotations

from homeassistant_gateway.application.development_models import (
    DevelopmentOperation,
    DevelopmentPack,
)

CORE_OPERATIONS = frozenset({"inventory", "states", "automations", "configuration", "services", "events", "history", "logbook", "gateway_ports"})


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
        DevelopmentOperation("gateway_ports", "Gateway ports and MCP transport", "Bounded local checks for the gateway listener and MCP authentication boundary."),
    )


def development_packs() -> tuple[DevelopmentPack, ...]:
    return (
        DevelopmentPack("basic_inventory", "Basic inventory", "Core read model and registries.", ("inventory", "states", "devices", "areas", "floors", "labels", "entity_registry")),
        DevelopmentPack("automation_diagnostics", "Automation diagnostics", "Automations and related state/activity data.", ("automations", "scripts", "scenes", "helpers", "history", "logbook")),
        DevelopmentPack("mcp_readiness", "MCP readiness", "Resources required by observer clients.", ("inventory", "services", "events", "configuration", "automations")),
        DevelopmentPack("data_completeness", "Data completeness", "Extended read model coverage and explicit endpoint failures.", tuple(item.name for item in development_catalog())),
    )
