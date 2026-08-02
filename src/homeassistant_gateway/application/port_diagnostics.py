from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


class PortDiagnosticsPort(Protocol):
    def run(self) -> dict[str, Any]: ...


@dataclass(frozen=True)
class PortDiagnostic:
    """Use-case result for bounded, local-only gateway connectivity checks."""

    checks: tuple[dict[str, Any], ...]

    @property
    def status(self) -> str:
        statuses = {str(check.get("status")) for check in self.checks}
        if "error" in statuses:
            return "error"
        if "warning" in statuses:
            return "warning"
        return "ok"

    def as_dict(self) -> dict[str, Any]:
        return {"status": self.status, "checks": list(self.checks)}
