from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import Response

from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.presentation.http_models import HealthResponse, ReadinessResponse
from homeassistant_gateway.presentation.ui import index_response


@dataclass(frozen=True)
class HealthRouteDependencies:
    home_assistant: HomeAssistantReadPort | None
    mcp_app: Any | None


def register_health_routes(app: FastAPI, dependencies: HealthRouteDependencies) -> None:
    @app.get("/", response_class=Response, include_in_schema=False)
    def index() -> Any:
        return index_response()

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.get("/ready", response_model=ReadinessResponse)
    def readiness() -> ReadinessResponse:
        upstream = "disabled" if dependencies.home_assistant is None else ("ready" if dependencies.home_assistant.health() else "unavailable")
        return ReadinessResponse(
            status="ready" if upstream != "unavailable" else "degraded",
            storage="ready",
            mcp="ready" if dependencies.mcp_app is not None else "disabled",
            home_assistant=upstream,
        )

    @app.get("/api/health/details")
    def health_details_resource() -> dict[str, Any]:
        if dependencies.home_assistant is None:
            return {"status": "disabled", "checks": []}
        provider = getattr(dependencies.home_assistant, "health_details", None)
        if not callable(provider):
            return {"status": "unknown", "checks": []}
        result = provider()
        return result if isinstance(result, dict) else {"status": "unknown", "checks": []}

    @app.get("/api/ui/context")
    def ui_context_resource(request: Request) -> dict[str, str]:
        context = {"locale": "en", "theme": "auto"}
        if dependencies.home_assistant is not None:
            try:
                provider = getattr(dependencies.home_assistant, "ui_context", None)
                if callable(provider):
                    provided = provider()
                    if isinstance(provided, dict):
                        context.update({str(key): str(value) for key, value in provided.items()})
            except HomeAssistantUnavailable:
                pass
        if context["locale"] == "en":
            accept_language = request.headers.get("accept-language", "")
            if accept_language:
                context["locale"] = accept_language.split(",", 1)[0].split(";", 1)[0].strip().replace("_", "-").lower() or "en"
        return context
