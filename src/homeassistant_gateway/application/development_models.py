from __future__ import annotations

from dataclasses import dataclass
from typing import Any


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


@dataclass(frozen=True)
class DevelopmentReport:
    report_id: str
    occurred_at: str
    operation: str
    status: str
    duration_ms: int
    total_count: int
    schema_fingerprint: str
    results: tuple[DevelopmentResult, ...]
    comparison: dict[str, Any] | None = None
    comparison_details: dict[str, Any] | None = None


@dataclass(frozen=True)
class DevelopmentPack:
    name: str
    label: str
    description: str
    operations: tuple[str, ...]
