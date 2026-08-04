from __future__ import annotations

from collections.abc import Callable, Collection
from dataclasses import asdict, dataclass
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response

from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.development import (
    DevelopmentReportStore,
    development_catalog,
    development_packs,
)
from homeassistant_gateway.application.development_jobs import DevelopmentJobManager
from homeassistant_gateway.application.home_assistant import HomeAssistantReadPort
from homeassistant_gateway.application.operator_mutations import OperatorMutationService
from homeassistant_gateway.application.operator_preview import build_operator_preview
from homeassistant_gateway.presentation.http_models import (
    DevelopmentRunRequest,
    OperatorApprovalRequest,
    OperatorExecuteRequest,
    OperatorPreviewRequest,
)


@dataclass(frozen=True)
class DevelopmentRouteDependencies:
    home_assistant: HomeAssistantReadPort | None
    development_jobs: DevelopmentJobManager | None
    development_report_store: DevelopmentReportStore | None
    enabled: bool
    operator_enabled: bool = False
    operator_mutations: OperatorMutationService | None = None
    operator_capabilities: tuple[str, ...] | Callable[[], tuple[str, ...]] = ()
    registered_mutation_tools: tuple[str, ...] | Callable[[], tuple[str, ...]] = ()
    operator_services_ceiling: Callable[[], Collection[str]] | None = None
    authenticate_client: AuthenticateClient | None = None
    authorize_request: AuthorizeRequest | None = None


def register_development_routes(app: FastAPI, dependencies: DevelopmentRouteDependencies) -> None:
    def operator_capabilities() -> tuple[str, ...]:
        return dependencies.operator_capabilities() if callable(dependencies.operator_capabilities) else dependencies.operator_capabilities

    def registered_mutation_tools() -> tuple[str, ...]:
        return dependencies.registered_mutation_tools() if callable(dependencies.registered_mutation_tools) else dependencies.registered_mutation_tools

    def require_operator_client(request: Request, capability: str, target: str | None = None, proposed: dict[str, Any] | None = None) -> None:
        if dependencies.authenticate_client is None or dependencies.authorize_request is None:
            raise HTTPException(status_code=503, detail="operator_authorization_not_configured")
        from homeassistant_gateway.presentation.auth_headers import parse_bearer_token

        client = dependencies.authenticate_client.execute(parse_bearer_token(request.headers.get("authorization")) or "")
        if client is None:
            raise HTTPException(status_code=401, detail="invalid_client_token")
        if target is not None:
            service = target
            if capability == "ha.write.automations":
                action = (proposed or {}).get("action")
                service = f"automation.{action}" if isinstance(action, str) else ""
            ceiling = None if dependencies.operator_services_ceiling is None else set(dependencies.operator_services_ceiling())
            if service not in client.operator_services or (ceiling is not None and service not in ceiling):
                raise HTTPException(status_code=403, detail="service_not_granted_to_client")
        decision = dependencies.authorize_request.execute(client.client_id, capability, mutation=True)
        if decision.decision.value != "approval_required":
            raise HTTPException(status_code=403, detail=decision.reason)

    @app.get("/api/development/catalog")
    def development_catalog_resource() -> dict[str, Any]:
        upstream = "disabled" if dependencies.home_assistant is None else ("ready" if dependencies.home_assistant.health() else "unavailable")
        return {
            "enabled": dependencies.enabled,
            "upstream": upstream,
            "operations": [asdict(item) for item in development_catalog()],
            "packs": [asdict(item) for item in development_packs()],
            "mutations": {
                "status": "ready" if registered_mutation_tools() else "disabled",
                "reason": None if registered_mutation_tools() else "mutation_execution_disabled",
                "approval_required": True,
                "operator_enabled": dependencies.operator_enabled,
                "capabilities": operator_capabilities(),
                "registered_mutation_tools": registered_mutation_tools(),
            },
        }

    @app.get("/api/operator/status")
    def operator_status_resource() -> dict[str, Any]:
        return {
            "profile": "operator",
            "operator_enabled": dependencies.operator_enabled,
            "execution": "ready" if registered_mutation_tools() else "disabled",
            "registered_mutation_tools": registered_mutation_tools(),
            "capabilities": operator_capabilities(),
            "reason": None if registered_mutation_tools() else "mutation_execution_disabled",
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

    @app.post("/api/operator/approval")
    def operator_approval_resource(request: Request, payload: OperatorApprovalRequest) -> dict[str, Any]:
        if not dependencies.operator_enabled or dependencies.operator_mutations is None:
            raise HTTPException(status_code=403, detail="operator_disabled")
        require_operator_client(request, payload.capability, payload.target, payload.proposed)
        try:
            grant = dependencies.operator_mutations.request_approval(payload.operation, payload.target, payload.capability, payload.proposed)
        except (RuntimeError, ValueError) as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        return {"approval_id": grant.approval_id, "approval_token": grant.token, "expires_at": grant.expires_at.isoformat()}

    @app.post("/api/operator/execute")
    def operator_execute_resource(request: Request, payload: OperatorExecuteRequest) -> dict[str, Any]:
        if not dependencies.operator_enabled or dependencies.operator_mutations is None:
            raise HTTPException(status_code=403, detail="operator_disabled")
        require_operator_client(request, payload.capability, payload.target, payload.proposed)
        try:
            return dependencies.operator_mutations.execute(
                payload.operation,
                payload.target,
                payload.capability,
                payload.proposed,
                payload.approval_id,
                payload.approval_token,
                payload.idempotency_key,
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

    @app.get("/api/development/reports")
    def development_reports_resource(limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, Any]]:
        if dependencies.development_report_store is None:
            return []
        return [asdict(report) for report in dependencies.development_report_store.list(limit)]
