from __future__ import annotations

from typing import Any

import pytest

from homeassistant_gateway.application.development import (
    DevelopmentToolRunner,
    development_catalog,
)


class FakeHomeAssistant:
    def inventory(self) -> dict[str, Any]:
        return {"entities": [{"entity_id": "light.kitchen"}], "services": [], "counts": {"entities": 1, "services": 0}}

    def states(self, entity_id: str | None = None) -> list[dict[str, Any]]:
        return [{"entity_id": entity_id or "light.kitchen", "state": "on"}]

    def automations(self) -> list[dict[str, Any]]:
        return [{"entity_id": "automation.test", "state": "on"}]

    def configuration(self) -> dict[str, Any]:
        return {"core": {"location_name": "Test"}, "entity_registry": [], "area_registry": []}

    def services(self) -> list[dict[str, Any]]:
        return [{"domain": "light", "services": {"turn_on": {}}}]

    def events(self) -> list[dict[str, Any]]:
        return [{"event": "state_changed"}]

    def history(self, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]:
        return [{"entity_id": entity_id or "light.kitchen", "start_time": start_time}]

    def logbook(self, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]:
        return [{"entity_id": entity_id or "light.kitchen", "when": start_time}]

    def health(self) -> bool:
        return True


def test_catalog_exposes_every_internal_observer_probe() -> None:
    assert [item.name for item in development_catalog()] == [
        "inventory",
        "states",
        "automations",
        "configuration",
        "services",
        "events",
        "history",
        "logbook",
    ]


def test_runner_returns_timing_and_count_for_probe() -> None:
    result = DevelopmentToolRunner(FakeHomeAssistant()).run("states", {"entity_id": "light.kitchen"})

    assert result.status == "ok"
    assert result.operation == "states"
    assert result.count == 1
    assert result.duration_ms >= 0
    assert result.data[0]["entity_id"] == "light.kitchen"


def test_runner_rejects_unknown_probe() -> None:
    with pytest.raises(ValueError, match="unknown_development_operation"):
        DevelopmentToolRunner(FakeHomeAssistant()).run("mutate_config", {})
