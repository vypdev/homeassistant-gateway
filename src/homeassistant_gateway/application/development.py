from __future__ import annotations

import json
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from hashlib import sha256
from time import monotonic
from typing import Any, Protocol

from homeassistant_gateway.application.development_catalog import (
    development_catalog,
    development_packs,
)
from homeassistant_gateway.application.development_models import (
    DevelopmentOperation,
    DevelopmentReport,
    DevelopmentResult,
)
from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.application.port_diagnostics import PortDiagnosticsPort


class DevelopmentReportStore(Protocol):
    def save(self, report: DevelopmentReport) -> None: ...

    def list(self, limit: int = 20) -> list[DevelopmentReport]: ...


def build_development_report(operation: str, results: Iterable[DevelopmentResult], previous: DevelopmentReport | None = None) -> DevelopmentReport:
    items = tuple(results)
    schema_source = [{"operation": item.operation, "status": item.status, "data": item.data} for item in items]
    fingerprint = sha256(json.dumps(schema_source, sort_keys=True, default=str, separators=(",", ":")).encode()).hexdigest()
    total_count = sum(item.count for item in items)
    status = "ok" if all(item.status == "ok" for item in items) else "partial"
    comparison = None
    comparison_details = None
    if previous is not None:
        previous_by_operation = {item.operation: item for item in previous.results}
        operation_changes = []
        regressions = []
        for item in items:
            old = previous_by_operation.get(item.operation)
            change = {"operation": item.operation, "count_delta": item.count - old.count if old else None, "previous_status": old.status if old else None, "status": item.status}
            operation_changes.append(change)
            if old and old.status == "ok" and item.status != "ok":
                regressions.append({"operation": item.operation, "kind": "status_regression", "from": old.status, "to": item.status})
            if old and old.status != "ok" and item.status == "ok":
                operation_changes[-1]["recovered"] = True
        comparison = {
            "previous_report_id": previous.report_id,
            "count_delta": total_count - previous.total_count,
            "schema_changed": fingerprint != previous.schema_fingerprint,
        }
        comparison_details = {"operation_changes": operation_changes, "regressions": regressions}
    report_id = sha256(f"{operation}:{datetime.now(UTC).isoformat()}:{fingerprint}".encode()).hexdigest()[:24]
    return DevelopmentReport(report_id, datetime.now(UTC).isoformat(), operation, status, sum(item.duration_ms for item in items), total_count, fingerprint, items, comparison, comparison_details)


class DevelopmentToolRunner:
    def __init__(self, home_assistant: HomeAssistantReadPort, port_diagnostics: PortDiagnosticsPort | None = None) -> None:
        self._home_assistant = home_assistant
        self._port_diagnostics = port_diagnostics
        self._operations: dict[str, Callable[..., Any]] = {
            "inventory": home_assistant.inventory,
            "states": home_assistant.states,
            "automations": home_assistant.automations,
            "configuration": home_assistant.configuration,
            "services": home_assistant.services,
            "events": home_assistant.events,
            "history": home_assistant.history,
            "logbook": home_assistant.logbook,
            **{operation.name: (lambda resource=operation.name: home_assistant.extended_read(resource)) for operation in development_catalog() if operation.name not in {"inventory", "states", "automations", "configuration", "services", "events", "history", "logbook", "gateway_ports"}},
            "gateway_ports": lambda: self._port_diagnostics.run() if self._port_diagnostics is not None else {"status": "error", "reason": "port_diagnostics_not_configured"},
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
            status="warning" if self._is_empty_result(data) else "ok",
            operation=operation,
            duration_ms=duration_ms,
            count=self._count(data),
            data=data,
            reason="empty_result" if self._is_empty_result(data) else None,
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
                        reason=str(error) if isinstance(error, HomeAssistantUnavailable) else type(error).__name__,
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
    def _is_empty_result(data: Any) -> bool:
        if isinstance(data, list):
            return not data
        if isinstance(data, dict):
            counts = data.get("counts")
            return isinstance(counts, dict) and bool(counts) and all(isinstance(value, int) and value == 0 for value in counts.values())
        return False

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
