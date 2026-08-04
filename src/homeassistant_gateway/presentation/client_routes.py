from __future__ import annotations

from collections.abc import Callable, Collection
from dataclasses import dataclass

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import Response

from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.clients import (
    IssueClient,
    ListClients,
    RevokeClient,
    RotateClient,
)
from homeassistant_gateway.application.home_assistant import HomeAssistantReadPort
from homeassistant_gateway.application.operator_policy import (
    OperatorServicePolicyPort,
    normalize_service_catalog,
)
from homeassistant_gateway.presentation.auth_headers import parse_bearer_token
from homeassistant_gateway.presentation.http_models import (
    ClientResponse,
    CreateClientRequest,
    EvaluatePolicyRequest,
    IssuedClientResponse,
    MCPDiscoveryResponse,
    PolicyDecisionResponse,
)


@dataclass(frozen=True)
class ClientRouteDependencies:
    issue_client: IssueClient
    list_clients: ListClients
    revoke_client: RevokeClient
    rotate_client: RotateClient
    authenticate_client: AuthenticateClient
    authorize_request: AuthorizeRequest
    home_assistant: HomeAssistantReadPort | None = None
    operator_service_policy: OperatorServicePolicyPort | None = None
    operator_services_ceiling: Callable[[], Collection[str]] | None = None
def register_client_routes(app: FastAPI, dependencies: ClientRouteDependencies) -> None:
    @app.get("/api/clients", response_model=list[ClientResponse])
    def list_client_resources() -> list[ClientResponse]:
        return [ClientResponse.from_domain(client) for client in dependencies.list_clients.execute()]

    @app.get("/api/mcp/discovery", response_model=MCPDiscoveryResponse)
    def mcp_discovery_resource(request: Request) -> MCPDiscoveryResponse:
        token = parse_bearer_token(request.headers.get("authorization"))
        client = dependencies.authenticate_client.execute(token or "")
        if client is None:
            raise HTTPException(status_code=401, detail="invalid_client_token")
        tools = ["gateway_diagnostics", "ha_inventory", "ha_states", "ha_automations", "ha_automation_config", "ha_configuration", "ha_services", "ha_events", "ha_history", "ha_logbook", "ha_devices", "ha_areas", "ha_floors", "ha_labels", "ha_entity_registry", "ha_scripts", "ha_scenes", "ha_helpers", "ha_integrations"]
        ceiling = None if dependencies.operator_services_ceiling is None else set(dependencies.operator_services_ceiling())
        if client.profile.value == "operator" and "ha.write.services" in client.capabilities and (ceiling is None or client.operator_services & ceiling):
            tools.extend(("ha_request_service_approval", "ha_execute_service_call"))
        if client.profile.value == "operator" and "ha.write.automations" in client.capabilities and (ceiling is None or any(service.startswith("automation.") for service in client.operator_services & ceiling)):
            tools.extend(("ha_request_automation_approval", "ha_execute_automation"))
        return MCPDiscoveryResponse(
            server_name="homeassistant-gateway-observer",
            transport="streamable-http",
            endpoint="/mcp/",
            client_id=client.client_id,
            profile=client.profile,
            capabilities=client.capabilities,
            tools=tuple(tools),
        )

    @app.get("/api/operator/service-policy")
    def operator_service_policy_resource() -> dict[str, object]:
        if dependencies.operator_service_policy is None:
            raise HTTPException(status_code=503, detail="operator_policy_not_configured")
        raw_catalog = dependencies.home_assistant.services() if dependencies.home_assistant is not None else []
        catalog = normalize_service_catalog(raw_catalog)
        return {
            "services": catalog,
            "selected": dependencies.operator_service_policy.get_allowed_services(),
        }

    @app.put("/api/operator/service-policy")
    def update_operator_service_policy(payload: dict[str, object]) -> dict[str, object]:
        if dependencies.operator_service_policy is None:
            raise HTTPException(status_code=503, detail="operator_policy_not_configured")
        raw_selected = payload.get("selected")
        if not isinstance(raw_selected, list) or len(raw_selected) > 500 or not all(isinstance(item, str) for item in raw_selected):
            raise HTTPException(status_code=400, detail="operator_service_policy_invalid")
        catalog = normalize_service_catalog(dependencies.home_assistant.services() if dependencies.home_assistant is not None else [])
        available = {item["id"] for item in catalog}
        selected = tuple(sorted(set(raw_selected)))
        if any(item not in available for item in selected):
            raise HTTPException(status_code=400, detail="operator_service_not_available")
        dependencies.operator_service_policy.set_allowed_services(selected)
        return {"selected": selected}

    @app.get("/api/client/me", response_model=ClientResponse)
    def client_identity_resource(request: Request) -> ClientResponse:
        token = parse_bearer_token(request.headers.get("authorization"))
        client = dependencies.authenticate_client.execute(token or "")
        if client is None:
            raise HTTPException(status_code=401, detail="invalid_client_token")
        return ClientResponse.from_domain(client)

    @app.post("/api/policy/evaluate", response_model=PolicyDecisionResponse)
    def evaluate_policy_resource(request: EvaluatePolicyRequest) -> PolicyDecisionResponse:
        decision = dependencies.authorize_request.execute(client_id=request.client_id, capability=request.capability, mutation=request.mutation)
        return PolicyDecisionResponse(decision=decision.decision, reason=decision.reason)

    @app.post("/api/clients", response_model=IssuedClientResponse, status_code=status.HTTP_201_CREATED)
    def issue_client_resource(request: CreateClientRequest) -> IssuedClientResponse:
        if request.operator_services:
            catalog = normalize_service_catalog(dependencies.home_assistant.services() if dependencies.home_assistant is not None else [])
            available = {item["id"] for item in catalog}
            ceiling = None if dependencies.operator_services_ceiling is None else set(dependencies.operator_services_ceiling())
            if any(service == "*" or (available and service not in available) or (ceiling is not None and service not in ceiling) for service in request.operator_services):
                raise HTTPException(status_code=400, detail="operator_service_not_available")
        try:
            issued = dependencies.issue_client.execute(client_id=request.client_id, display_name=request.display_name, profile=request.profile, capabilities=request.capabilities, operator_services=request.operator_services)
        except ValueError as error:
            reason = str(error)
            if reason == "client_already_exists":
                raise HTTPException(status_code=409, detail=reason) from error
            if reason in {"operator_disabled", "observer_operator_capability_conflict"}:
                raise HTTPException(status_code=403, detail=reason) from error
            raise HTTPException(status_code=400, detail=reason) from error
        client = ClientResponse.from_domain(issued.client)
        return IssuedClientResponse(**client.model_dump(), token=issued.token)

    @app.post("/api/clients/{client_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
    def revoke_client_resource(client_id: str) -> Response:
        dependencies.revoke_client.execute(client_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post("/api/clients/{client_id}/rotate", response_model=IssuedClientResponse, status_code=status.HTTP_201_CREATED)
    def rotate_client_resource(client_id: str) -> IssuedClientResponse:
        try:
            issued = dependencies.rotate_client.execute(client_id)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        client = ClientResponse.from_domain(issued.client)
        return IssuedClientResponse(**client.model_dump(), token=issued.token)
