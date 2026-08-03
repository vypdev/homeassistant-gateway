from __future__ import annotations

from typing import Any

import pytest

from homeassistant_gateway.application.development import (
    DevelopmentResult,
    DevelopmentToolRunner,
    build_development_report,
    development_catalog,
)


class FakePortDiagnostics:
    def run(self) -> dict[str, Any]:
        return {"status": "warning", "checks": [{"name": "host_port_publication", "status": "warning", "reason": "not_verifiable_from_app_container"}]}


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

    def extended_read(self, resource: str) -> list[dict[str, Any]]:
        return [{"resource": resource}]

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
        "devices",
        "areas",
        "floors",
        "labels",
        "entity_registry",
        "scripts",
        "scenes",
        "helpers",
        "integrations",
        "gateway_ports",
    ]


def test_runner_returns_timing_and_count_for_probe() -> None:
    result = DevelopmentToolRunner(FakeHomeAssistant()).run("states", {"entity_id": "light.kitchen"})

    assert result.status == "ok"
    assert result.operation == "states"
    assert result.count == 1
    assert result.duration_ms >= 0
    assert result.data[0]["entity_id"] == "light.kitchen"
    assert result.trace[0].phase == "execute"
    assert result.trace[0].transport == "application"


def test_runner_supports_extended_registry_resources() -> None:
    result = DevelopmentToolRunner(FakeHomeAssistant()).run("devices", {})

    assert result.status == "ok"
    assert result.data == [{"resource": "devices"}]


def test_runner_warns_when_expected_list_is_empty() -> None:
    class EmptyHomeAssistant(FakeHomeAssistant):
        def extended_read(self, resource: str) -> list[dict[str, Any]]:
            return []

    result = DevelopmentToolRunner(EmptyHomeAssistant()).run("devices", {})

    assert result.status == "warning"
    assert result.reason == "empty_result"
    assert result.count == 0


def test_port_diagnostics_is_explicitly_local_only() -> None:
    result = DevelopmentToolRunner(FakeHomeAssistant(), FakePortDiagnostics()).run("gateway_ports", {})

    assert result.status == "ok"
    assert result.operation == "gateway_ports"
    assert result.data["status"] == "warning"
    assert result.data["checks"][0]["reason"] == "not_verifiable_from_app_container"


def test_build_development_report_compares_previous_schema() -> None:
    first = build_development_report("all", (DevelopmentResult("ok", "states", 3, 2, [{"state": "on"}]),))
    second = build_development_report("all", (DevelopmentResult("ok", "states", 4, 4, [{"state": "off"}]),), first)

    assert first.schema_fingerprint != second.schema_fingerprint
    assert second.comparison == {"previous_report_id": first.report_id, "count_delta": 2, "schema_changed": True}


def test_runner_rejects_unknown_probe() -> None:
    with pytest.raises(ValueError, match="unknown_development_operation"):
        DevelopmentToolRunner(FakeHomeAssistant()).run("mutate_config", {})
