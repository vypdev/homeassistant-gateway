"""Single source of truth for capability-to-tool parity and safe probes."""

from dataclasses import dataclass


@dataclass(frozen=True)
class CapabilityDefinition:
    name: str
    group: str
    tool: str | None
    probe_kind: str
    implemented: bool = True


CAPABILITY_DEFINITIONS: tuple[CapabilityDefinition, ...] = (
    CapabilityDefinition("ha.read.diagnostics", "observer", "gateway_diagnostics", "gateway_diagnostics"),
    CapabilityDefinition("ha.read.entities", "observer", "ha_inventory", "inventory"),
    CapabilityDefinition("ha.read.states", "observer", "ha_states", "states"),
    CapabilityDefinition("ha.read.automations", "observer", "ha_automations", "automations"),
    CapabilityDefinition("ha.read.automation_config", "observer", "ha_automation_config", "automation_config"),
    CapabilityDefinition("ha.read.config_entries", "observer", "ha_configuration", "configuration"),
    CapabilityDefinition("ha.read.history", "observer", "ha_history", "history"),
    CapabilityDefinition("ha.read.logbook", "observer", "ha_logbook", "logbook"),
    CapabilityDefinition("ha.read.registry", "observer", None, "registry", implemented=True),
    CapabilityDefinition("ha.read.services", "observer", "ha_services", "services"),
    CapabilityDefinition("ha.read.events", "observer", "ha_events", "events"),
    CapabilityDefinition("ha.write.services", "operator", "ha_request_service_approval", "mutation_policy"),
    CapabilityDefinition("ha.write.automations", "operator", "ha_request_automation_approval", "mutation_policy"),
    CapabilityDefinition("ha.write.configuration", "operator", None, "unsupported", implemented=False),
)


def capability_definition(name: str) -> CapabilityDefinition | None:
    return next((definition for definition in CAPABILITY_DEFINITIONS if definition.name == name), None)
