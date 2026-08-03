from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, Response

from homeassistant_gateway.application.development import (
    DevelopmentReportStore,
    development_catalog,
    development_packs,
)
from homeassistant_gateway.application.development_jobs import DevelopmentJobManager
from homeassistant_gateway.application.home_assistant import HomeAssistantReadPort
from homeassistant_gateway.application.operator_preview import build_operator_preview
from homeassistant_gateway.presentation.http_models import (
    DevelopmentRunRequest,
    OperatorPreviewRequest,
)


@dataclass(frozen=True)
class DevelopmentRouteDependencies:
    home_assistant: HomeAssistantReadPort | None
    development_jobs: DevelopmentJobManager | None
    development_report_store: DevelopmentReportStore | None
    enabled: bool
    operator_enabled: bool = False


def register_development_routes(app: FastAPI, dependencies: DevelopmentRouteDependencies) -> None:
    @app.get("/api/development/catalog")
    def development_catalog_resource() -> dict[str, Any]:
        upstream = "disabled" if dependencies.home_assistant is None else ("ready" if dependencies.home_assistant.health() else "unavailable")
        return {
            "enabled": dependencies.enabled,
            "upstream": upstream,
            "operations": [asdict(item) for item in development_catalog()],
            "packs": [asdict(item) for item in development_packs()],
            "mutations": {
                "status": "disabled",
                "reason": "operator_mutations_not_implemented",
                "approval_required": True,
                "operator_enabled": dependencies.operator_enabled,
            },
        }

    @app.get("/api/operator/status")
    def operator_status_resource() -> dict[str, Any]:
        return {
            "profile": "operator",
            "operator_enabled": dependencies.operator_enabled,
            "execution": "disabled",
            "registered_mutation_tools": [],
            "capabilities": [],
            "reason": "operator_mutations_not_implemented",
        }

    @app.post("/api/development/run", status_code=202)
    def development_run_resource(request: DevelopmentRunRequest) -> Response:
        if not dependencies.enabled:
            raise HTTPException(status_code=403, detail="development_console_disabled")
        if dependencies.development_jobs is None:
            raise HTTPException(status_code=503, detail="home_assistant_not_configured")
        try:
            job_id = dependencies.development_jobs.start(request.operation, request.parameters)
        except RuntimeError as error:
            raise HTTPException(status_code=429, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        return JSONResponse(status_code=202, headers={"Location": f"/api/development/jobs/{job_id}"}, content={"status": "queued", "job_id": job_id, "operation": request.operation})

    @app.get("/api/development/jobs/{job_id}")
    def development_job_resource(job_id: str) -> dict[str, Any]:
        if dependencies.development_jobs is None:
            raise HTTPException(status_code=503, detail="home_assistant_not_configured")
        snapshot = dependencies.development_jobs.snapshot(job_id)
        if snapshot is None:
            raise HTTPException(status_code=404, detail="development_job_not_found")
        return snapshot

    @app.post("/api/operator/preview")
    def operator_preview_resource(request: OperatorPreviewRequest) -> dict[str, Any]:
        try:
            return asdict(build_operator_preview(request.operation, request.target, request.capability, request.proposed, request.current))
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/development/reports")
    def development_reports_resource(limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, Any]]:
        if dependencies.development_report_store is None:
            return []
        return [asdict(report) for report in dependencies.development_report_store.list(limit)]
