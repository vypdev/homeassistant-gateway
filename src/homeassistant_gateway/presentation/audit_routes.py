from __future__ import annotations

from dataclasses import dataclass

from fastapi import FastAPI, Query

from homeassistant_gateway.application.audit import AuditReader
from homeassistant_gateway.presentation.http_models import AuditEventResponse


@dataclass(frozen=True)
class AuditRouteDependencies:
    audit_reader: AuditReader | None


def register_audit_routes(app: FastAPI, dependencies: AuditRouteDependencies) -> None:
    @app.get("/api/audit", response_model=list[AuditEventResponse])
    def audit_events(
        limit: int = Query(default=100, ge=1, le=1000),
        decision: str | None = Query(default=None, max_length=64),
    ) -> list[AuditEventResponse]:
        if dependencies.audit_reader is None:
            return []
        return [AuditEventResponse.from_domain(event) for event in dependencies.audit_reader.list(limit=limit, decision=decision)]
