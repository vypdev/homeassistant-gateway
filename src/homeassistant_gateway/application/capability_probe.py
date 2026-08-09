"""Application use case for safe, non-mutating capability verification."""

from dataclasses import dataclass
from typing import Any, Protocol

from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.capability_catalog import (
    CAPABILITY_DEFINITIONS,
    CapabilityDefinition,
)
from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.domain.clients import Client
from homeassistant_gateway.domain.policy import Decision


class CapabilityProbeClientRepository(Protocol):
    def get(self, client_id: str) -> Client | None: ...


@dataclass(frozen=True)
class CapabilityProbeResult:
    capability: str
    group: str
    tool: str | None
    decision: str
    status: str
    reason: str
    implemented: bool
    sample_entity_id: str | None = None
    count: int | None = None
    details: dict[str, Any] | None = None


@dataclass(frozen=True)
class CapabilityProbeReport:
    client_id: str
    generated_for: str
    results: tuple[CapabilityProbeResult, ...]


class ProbeCapabilities:
    """Evaluate and, for read capabilities, exercise the same bounded read port as MCP."""

    def __init__(
        self,
        repository: CapabilityProbeClientRepository,
        authorize_request: AuthorizeRequest,
        home_assistant: HomeAssistantReadPort,
    ) -> None:
        self._repository = repository
        self._authorize_request = authorize_request
        self._home_assistant = home_assistant

    def execute(self, client_id: str, entity_id: str | None = None) -> CapabilityProbeReport:
        client = self._repository.get(client_id)
        if client is None:
            return CapabilityProbeReport(client_id=client_id, generated_for="unknown_client", results=())
        results = tuple(self._probe(client, definition, entity_id) for definition in CAPABILITY_DEFINITIONS)
        return CapabilityProbeReport(client_id=client_id, generated_for=client.display_name, results=results)

    def _probe(self, client: Client, definition: CapabilityDefinition, entity_id: str | None) -> CapabilityProbeResult:
        decision = self._authorize_request.execute(client.client_id, definition.name, mutation=definition.group == "operator")
        base = {
            "capability": definition.name,
            "group": definition.group,
            "tool": definition.tool,
            "implemented": definition.implemented,
        }
        if decision.decision is Decision.DENIED:
            return CapabilityProbeResult(**base, decision=decision.decision.value, status="denied", reason=decision.reason)
        if not definition.implemented:
            return CapabilityProbeResult(**base, decision=decision.decision.value, status="unsupported", reason="tool_not_registered")
        if definition.group == "operator":
            return CapabilityProbeResult(**base, decision=decision.decision.value, status="approval_required", reason="no_mutation_executed")
        try:
            sample, count, sample_entity, details = self._read(definition, entity_id)
            return CapabilityProbeResult(
                **base,
                decision=decision.decision.value,
                status="ok",
                reason="read_succeeded",
                sample_entity_id=sample_entity,
                count=count,
                details={"shape": self._shape(sample), **details},
            )
        except HomeAssistantUnavailable as error:
            return CapabilityProbeResult(
                **base,
                decision=decision.decision.value,
                status="error",
                reason=error.code,
                details={"path": error.path, "http_status": error.status, "parameters": list(error.params)},
            )
        except (RuntimeError, ValueError, TypeError) as error:
            return CapabilityProbeResult(**base, decision=decision.decision.value, status="error", reason=self._safe_reason(error))

    def _read(self, definition: CapabilityDefinition, entity_id: str | None) -> tuple[Any, int | None, str | None, dict[str, Any]]:
        kind = definition.probe_kind
        if kind == "gateway_diagnostics":
            value = self._home_assistant.health_details()
            return value, len(value.get("checks", [])), None, {}
        if kind == "inventory":
            value = self._home_assistant.inventory()
            return value, len(value.get("entities", [])) if isinstance(value, dict) else None, None, {}
        if kind == "states":
            value = self._home_assistant.states(entity_id)
            return value, len(value), entity_id, {}
        if kind == "automations":
            value = self._home_assistant.automations()
            sample_entity = entity_id or (value[0].get("entity_id") if value and isinstance(value[0], dict) else None)
            return value, len(value), sample_entity, {}
        if kind == "automation_config":
            sample_entity = entity_id or self._first_automation_id()
            value = self._home_assistant.automation_config(sample_entity)
            return value, 1, sample_entity, {"keys": sorted(value) if isinstance(value, dict) else []}
        if kind == "configuration":
            value = self._home_assistant.configuration()
            return value, len(value) if isinstance(value, dict) else None, None, {}
        if kind == "history":
            value = self._home_assistant.history(entity_id)
            return value, len(value), entity_id, {}
        if kind == "logbook":
            value = self._home_assistant.logbook(entity_id)
            return value, len(value), entity_id, {}
        if kind == "registry":
            value = self._home_assistant.extended_read("devices")
            return value, len(value), None, {"resource": "devices"}
        if kind == "services":
            value = self._home_assistant.services()
            return value, len(value), None, {}
        if kind == "events":
            value = self._home_assistant.events()
            return value, len(value), None, {}
        raise ValueError("probe_kind_not_implemented")

    def _first_automation_id(self) -> str:
        values = self._home_assistant.automations()
        for value in values:
            if isinstance(value, dict) and isinstance(value.get("entity_id"), str):
                return value["entity_id"]
        raise ValueError("automation_sample_not_available")

    @staticmethod
    def _shape(value: Any) -> str:
        if isinstance(value, list):
            return "list"
        if isinstance(value, dict):
            return "object"
        return type(value).__name__

    @staticmethod
    def _safe_reason(error: Exception) -> str:
        reason = str(error).strip().lower().replace(" ", "_")
        return reason[:128] or "probe_failed"
