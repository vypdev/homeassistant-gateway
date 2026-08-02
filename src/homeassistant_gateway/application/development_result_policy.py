from __future__ import annotations

import json
from collections.abc import Iterable
from datetime import UTC, datetime
from hashlib import sha256

from homeassistant_gateway.application.development_models import (
    DevelopmentReport,
    DevelopmentResult,
)


def build_development_report(
    operation: str,
    results: Iterable[DevelopmentResult],
    previous: DevelopmentReport | None = None,
) -> DevelopmentReport:
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
            change = {
                "operation": item.operation,
                "count_delta": item.count - old.count if old else None,
                "previous_status": old.status if old else None,
                "status": item.status,
            }
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
    occurred_at = datetime.now(UTC).isoformat()
    report_id = sha256(f"{operation}:{occurred_at}:{fingerprint}".encode()).hexdigest()[:24]
    return DevelopmentReport(
        report_id,
        occurred_at,
        operation,
        status,
        sum(item.duration_ms for item in items),
        total_count,
        fingerprint,
        items,
        comparison,
        comparison_details,
    )
