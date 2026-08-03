from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.infrastructure.home_assistant.automation_reader import (
    SupervisorAutomationReader,
)
from homeassistant_gateway.infrastructure.home_assistant.client import SupervisorApiClient
from homeassistant_gateway.infrastructure.home_assistant.core_reader import SupervisorCoreReader
from homeassistant_gateway.infrastructure.home_assistant.history_reader import (
    SupervisorHistoryReader,
)
from homeassistant_gateway.infrastructure.home_assistant.registry_reader import (
    SupervisorRegistryReader,
)


class SupervisorHomeAssistantClient(SupervisorApiClient, SupervisorCoreReader, SupervisorHistoryReader, SupervisorRegistryReader, SupervisorAutomationReader, HomeAssistantReadPort):

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
