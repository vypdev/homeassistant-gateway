from __future__ import annotations

import re
from typing import Any

from homeassistant_gateway.application.automation_config import (
    analyze_automation_config,
    render_automation_yaml,
)
from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable, redact

_AUTOMATION_ENTITY_PREFIX = "automation."
_AUTOMATION_ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


class SupervisorAutomationReader:
    """Read one bounded automation configuration through Home Assistant's API."""

    def automation_config(self: Any, entity_id: str | None = None) -> dict[str, Any]:
        selected = self._select_automation(entity_id)
        automation_id = str(selected.get("attributes", {}).get("id", ""))
        if not _AUTOMATION_ID.fullmatch(automation_id):
            raise HomeAssistantUnavailable("automation_config_id_invalid", path="/config/automation/config")
        payload = self._get_json(
            f"/config/automation/config/{automation_id}",
            default={},
            diagnostic_path="/config/automation/config/{id}",
        )
        if not isinstance(payload, dict):
            raise HomeAssistantUnavailable("automation_config_invalid_response", path="/config/automation/config/{id}")
        config = redact(payload)
        config.setdefault("id", automation_id)
        config.setdefault("entity_id", selected.get("entity_id"))
        config.setdefault("friendly_name", selected.get("attributes", {}).get("friendly_name"))
        return {
            "entity_id": selected.get("entity_id"),
            "friendly_name": selected.get("attributes", {}).get("friendly_name"),
            "config_id": automation_id,
            "configuration": config,
            "yaml": render_automation_yaml(config),
            "findings": analyze_automation_config(config),
        }

    def _select_automation(self: Any, entity_id: str | None) -> dict[str, Any]:
        if entity_id is not None and not entity_id.startswith(_AUTOMATION_ENTITY_PREFIX):
            raise ValueError("automation_entity_id_required")
        automations = self.automations()
        if entity_id is not None:
            automations = [item for item in automations if item.get("entity_id") == entity_id]
        if not automations:
            raise HomeAssistantUnavailable("automation_config_not_found", path="/states")
        return automations[0]
