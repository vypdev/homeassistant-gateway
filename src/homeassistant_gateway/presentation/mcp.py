import contextvars
import json
from collections.abc import Awaitable, Callable
from dataclasses import asdict, dataclass
from typing import Any

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from homeassistant_gateway.application.home_assistant import (
    HomeAssistantReadPort,
    HomeAssistantUnavailable,
)
from homeassistant_gateway.application.observer import ObserverDiagnostics
from homeassistant_gateway.application.operator_mutations import OperatorMutationService
from homeassistant_gateway.presentation.auth_headers import parse_bearer_token

_current_token: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "gateway_mcp_token", default=None
)


def _transport_allowed_hosts(hosts: tuple[str, ...]) -> list[str]:
    """Expand host-only configuration into SDK host-with-port patterns."""
    expanded: list[str] = []
    for host in hosts:
        value = host.strip()
        if not value:
            continue
        expanded.append(value)
        if value.endswith(":*"):
            continue
        if (value.startswith("[") and value.endswith("]")) or ":" not in value:
            expanded.append(f"{value}:*")
    return expanded

@dataclass(frozen=True)
class MCPApp:
    application: Any
    lifespan: Callable[..., Any]


class BearerMCPMiddleware:
    """Reject unauthenticated MCP HTTP requests before the MCP handshake."""

    def __init__(self, app: Callable[..., Awaitable[Any]], authenticate: Callable[[str], Any]) -> None:
        self._app = app
        self._authenticate = authenticate

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope.get("type") != "http":
            await self._app(scope, receive, send)
            return

        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }
        token = parse_bearer_token(headers.get("authorization"))
        if token is None or self._authenticate(token) is None:
            body = json.dumps({"detail": "invalid_client_token"}).encode("utf-8")
            await send(
                {"type": "http.response.start", "status": 401, "headers": [(b"content-type", b"application/json")]}
            )
            await send({"type": "http.response.body", "body": body})
            return

        marker = _current_token.set(token)
        try:
            await self._app(scope, receive, send)
        finally:
            _current_token.reset(marker)


def create_mcp_app(
    diagnostics: ObserverDiagnostics,
    authenticate: Callable[[str], Any],
    authorize: Callable[..., Any],
    home_assistant: HomeAssistantReadPort | None = None,
    operator_mutations: OperatorMutationService | None = None,
    allowed_hosts: tuple[str, ...] = ("localhost", "127.0.0.1", "[::1]"),
) -> MCPApp:
    server = FastMCP(
        "homeassistant-gateway-observer",
        instructions="Read-only Home Assistant gateway diagnostics.",
        stateless_http=True,
        json_response=True,
        streamable_http_path="/",
        transport_security=TransportSecuritySettings(allowed_hosts=_transport_allowed_hosts(allowed_hosts)),
    )

    @server.tool(
        name="gateway_diagnostics",
        description="Return bounded, read-only diagnostics for the authenticated gateway client.",
    )
    def gateway_diagnostics() -> dict[str, Any]:
        token = _current_token.get()
        if token is None:
            return {"status": "denied", "reason": "invalid_client_token"}
        try:
            return asdict(diagnostics.execute(token))
        except PermissionError as error:
            return {"status": "denied", "reason": str(error)}

    def authorize_tool(capability: str) -> dict[str, Any] | None:
        token = _current_token.get()
        if token is None:
            return {"status": "denied", "reason": "invalid_client_token"}
        client = authenticate(token)
        if client is None:
            return {"status": "denied", "reason": "invalid_client_token"}
        decision = authorize(client.client_id, capability, mutation=False)
        if decision.decision.value != "allowed":
            return {"status": "denied", "reason": decision.reason}
        if home_assistant is None:
            return {"status": "unavailable", "reason": "home_assistant_not_configured"}
        return None

    def read_tool(capability: str, operation: Callable[[], Any]) -> dict[str, Any]:
        denied = authorize_tool(capability)
        if denied is not None:
            return denied
        try:
            return {"status": "ok", "data": operation()}
        except HomeAssistantUnavailable as error:
            result: dict[str, Any] = {"status": "unavailable", "reason": "home_assistant_unavailable", "code": error.code}
            if error.path is not None:
                result["path"] = error.path
            if error.status is not None:
                result["http_status"] = error.status
            return result

    def require_operator_mutation(capability: str) -> tuple[dict[str, Any] | None, str | None]:
        token = _current_token.get()
        if token is None:
            return {"status": "denied", "reason": "invalid_client_token"}, None
        client = authenticate(token)
        if client is None:
            return {"status": "denied", "reason": "invalid_client_token"}, None
        decision = authorize(client.client_id, capability, mutation=True)
        if decision.decision.value != "approval_required":
            return {"status": "denied", "reason": decision.reason}, None
        if operator_mutations is None:
            return {"status": "unavailable", "reason": "mutation_adapter_not_configured"}, None
        return None, client.client_id

    @server.tool(
        name="ha_inventory",
        description="Return a bounded, redacted Home Assistant entity and service inventory.",
    )
    def ha_inventory() -> dict[str, Any]:
        return read_tool("ha.read.entities", home_assistant.inventory)  # type: ignore[union-attr]

    @server.tool(
        name="ha_states",
        description="Return bounded, redacted Home Assistant states, optionally for one entity.",
    )
    def ha_states(entity_id: str | None = None) -> dict[str, Any]:
        return read_tool("ha.read.states", lambda: home_assistant.states(entity_id))  # type: ignore[union-attr]

    @server.tool(
        name="ha_automations",
        description="Return bounded, redacted automation entity states.",
    )
    def ha_automations() -> dict[str, Any]:
        return read_tool("ha.read.automations", home_assistant.automations)  # type: ignore[union-attr]

    @server.tool(
        name="ha_automation_config",
        description="Read and analyze one bounded Home Assistant automation configuration without executing it.",
    )
    def ha_automation_config(entity_id: str | None = None) -> dict[str, Any]:
        return read_tool("ha.read.automation_config", lambda: home_assistant.automation_config(entity_id))  # type: ignore[union-attr]

    @server.tool(
        name="ha_configuration",
        description="Return safe Home Assistant configuration and registry metadata without secrets.",
    )
    def ha_configuration() -> dict[str, Any]:
        return read_tool("ha.read.config_entries", home_assistant.configuration)  # type: ignore[union-attr]

    @server.tool(
        name="ha_history",
        description="Return bounded Home Assistant state history with optional entity and start-time filters.",
    )
    def ha_history(entity_id: str | None = None, start_time: str | None = None) -> dict[str, Any]:
        return read_tool("ha.read.history", lambda: home_assistant.history(entity_id, start_time))  # type: ignore[union-attr]

    @server.tool(
        name="ha_logbook",
        description="Return bounded Home Assistant logbook records with optional entity and start-time filters.",
    )
    def ha_logbook(entity_id: str | None = None, start_time: str | None = None) -> dict[str, Any]:
        return read_tool("ha.read.logbook", lambda: home_assistant.logbook(entity_id, start_time))  # type: ignore[union-attr]

    def register_extended_tool(name: str, resource: str) -> None:
        def tool() -> dict[str, Any]:
            return read_tool("ha.read.registry", lambda: home_assistant.extended_read(resource))  # type: ignore[union-attr]
        tool.__name__ = name
        server.tool(name=name, description=f"Return bounded Home Assistant {resource} data.")(tool)

    for _resource in ("devices", "areas", "floors", "labels", "entity_registry", "scripts", "scenes", "helpers", "integrations"):
        register_extended_tool(f"ha_{_resource}", _resource)

    @server.tool(name="ha_services", description="Return the bounded Home Assistant service catalog.")
    def ha_services() -> dict[str, Any]:
        return read_tool("ha.read.services", home_assistant.services)  # type: ignore[union-attr]

    @server.tool(name="ha_events", description="Return the bounded Home Assistant event catalog.")
    def ha_events() -> dict[str, Any]:
        return read_tool("ha.read.events", home_assistant.events)  # type: ignore[union-attr]

    @server.tool(
        name="ha_request_service_approval",
        description="Request explicit approval for one allowlisted Home Assistant service call.",
    )
    def ha_request_service_approval(target: str, proposed: dict[str, Any]) -> dict[str, Any]:
        denied, _ = require_operator_mutation("ha.write.services")
        if denied is not None:
            return denied
        try:
            grant = operator_mutations.request_approval("ha.call_service", target, "ha.write.services", proposed)  # type: ignore[union-attr]
            return {"status": "approval_required", "approval_id": grant.approval_id, "approval_token": grant.token, "expires_at": grant.expires_at.isoformat()}
        except (RuntimeError, ValueError) as error:
            return {"status": "denied", "reason": str(error)}

    @server.tool(
        name="ha_execute_service_call",
        description="Execute one previously approved allowlisted Home Assistant service call with an idempotency key.",
    )
    def ha_execute_service_call(target: str, proposed: dict[str, Any], approval_id: str, approval_token: str, idempotency_key: str) -> dict[str, Any]:
        denied, _ = require_operator_mutation("ha.write.services")
        if denied is not None:
            return denied
        try:
            return operator_mutations.execute("ha.call_service", target, "ha.write.services", proposed, approval_id, approval_token, idempotency_key)  # type: ignore[union-attr]
        except (PermissionError, RuntimeError, ValueError) as error:
            return {"status": "denied", "reason": str(error)}

    @server.tool(
        name="ha_request_automation_approval",
        description="Request explicit approval to trigger or enable/disable one Home Assistant automation.",
    )
    def ha_request_automation_approval(entity_id: str, action: str) -> dict[str, Any]:
        denied, _ = require_operator_mutation("ha.write.automations")
        if denied is not None:
            return denied
        try:
            grant = operator_mutations.request_approval("ha.update_automation", entity_id, "ha.write.automations", {"entity_id": entity_id, "action": action})  # type: ignore[union-attr]
            return {"status": "approval_required", "approval_id": grant.approval_id, "approval_token": grant.token, "expires_at": grant.expires_at.isoformat()}
        except (RuntimeError, ValueError) as error:
            return {"status": "denied", "reason": str(error)}

    @server.tool(
        name="ha_execute_automation",
        description="Execute one previously approved Home Assistant automation action with an idempotency key.",
    )
    def ha_execute_automation(entity_id: str, action: str, approval_id: str, approval_token: str, idempotency_key: str) -> dict[str, Any]:
        denied, _ = require_operator_mutation("ha.write.automations")
        if denied is not None:
            return denied
        try:
            proposed = {"entity_id": entity_id, "action": action}
            return operator_mutations.execute("ha.update_automation", entity_id, "ha.write.automations", proposed, approval_id, approval_token, idempotency_key)  # type: ignore[union-attr]
        except (PermissionError, RuntimeError, ValueError) as error:
            return {"status": "denied", "reason": str(error)}

    server_app = server.streamable_http_app()
    application = BearerMCPMiddleware(server_app, authenticate)
    return MCPApp(application=application, lifespan=server_app.router.lifespan_context)
