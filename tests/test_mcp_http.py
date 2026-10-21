import asyncio
from datetime import UTC, datetime

import httpx
from fastapi import FastAPI

from homeassistant_gateway.application.authorization import PolicyDecision
from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable
from homeassistant_gateway.application.operator_security import ApprovalGrant
from homeassistant_gateway.composition import AppSettings, build_app
from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Decision, Profile
from homeassistant_gateway.presentation.mcp import create_mcp_app


class TodoDiagnostics:
    def execute(self, token: str):
        return type("Diagnostics", (), {"status": "ok", "checks": []})()


class TodoOperator:
    def request_approval(self, operation, target, capability, proposed):
        return ApprovalGrant(
            approval_id="approval-1",
            operation=operation,
            target=target,
            proposal_fingerprint="unused",
            expires_at=datetime(2026, 8, 27, tzinfo=UTC),
            token="approval-token",
        )

    def execute(self, operation, target, capability, proposed, approval_id, approval_token, idempotency_key):
        return {
            "status": "ok",
            "operation": operation,
            "target": target,
            "data": {"todo.tareas": {"items": [{"summary": "Buy milk", "status": "needs_action"}]}},
        }


def todo_client() -> Client:
    return Client(
        client_id="todo-operator",
        display_name="Todo operator",
        profile=Profile.OPERATOR,
        capabilities=frozenset({"ha.write.services"}),
        operator_services=frozenset({"todo.get_items"}),
        created_at=datetime(2026, 8, 27, tzinfo=UTC),
        status=ClientStatus.ACTIVE,
        token_digest="digest",
    )


def test_mcp_streamable_http_enforces_bearer_and_capability(tmp_path) -> None:
    async def run() -> None:
        app = build_app(AppSettings(tmp_path))
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
        ) as client:
            ingress = {
                "X-Remote-User-Id": "test-user",
                "Content-Type": "application/json",
            }
            created = await client.post(
                "/api/clients",
                headers=ingress,
                json={
                    "client_id": "observer",
                    "display_name": "Observer",
                    "profile": "observer",
                    "capabilities": ["ha.read.diagnostics"],
                },
            )
            token = created.json()["token"]
            mcp_headers = {
                **ingress,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json, text/event-stream",
                "MCP-Protocol-Version": "2025-06-18",
            }

            initialize = await client.post(
                "/mcp/",
                headers=mcp_headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2025-06-18",
                        "capabilities": {},
                        "clientInfo": {"name": "test", "version": "1"},
                    },
                },
            )
            assert initialize.status_code == 200
            assert initialize.json()["result"]["serverInfo"]["name"] == "homeassistant-gateway-observer"

            called = await client.post(
                "/mcp/",
                headers=mcp_headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {"name": "gateway_diagnostics", "arguments": {}},
                },
            )
            assert called.status_code == 200
            assert called.json()["result"]["structuredContent"]["status"] == "ok"

    asyncio.run(run())


def test_mcp_direct_transport_uses_bearer_auth_without_ingress_identity(tmp_path) -> None:
    async def run() -> None:
        app = build_app(AppSettings(tmp_path, mcp_allowed_hosts=("localhost", "192.168.20.101")))
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
        ) as client:
            response = await client.post(
                "/mcp/",
                headers={
                    "Content-Type": "application/json",
                    "Host": "192.168.20.101:18099",
                    "Authorization": "Bearer hgw_invalid",
                    "Accept": "application/json, text/event-stream",
                },
                json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            )

            assert response.status_code == 401
            assert response.json() == {"detail": "invalid_client_token"}

    asyncio.run(run())


def test_mcp_streamable_http_rejects_invalid_bearer(tmp_path) -> None:
    async def run() -> None:
        app = build_app(AppSettings(tmp_path))
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
        ) as client:
            response = await client.post(
                "/mcp/",
                headers={
                    "X-Remote-User-Id": "test-user",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer hgw_invalid",
                    "Accept": "application/json, text/event-stream",
                },
                json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            )

            assert response.status_code == 401
            assert response.json() == {"detail": "invalid_client_token"}

    asyncio.run(run())


def test_operator_discovery_lists_only_configured_mutation_tools(tmp_path) -> None:
    async def run() -> None:
        app = build_app(AppSettings(tmp_path, operator_enabled=True, operator_allowed_services=("light.turn_on", "automation.trigger")))
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
        ) as client:
            ingress = {"X-Remote-User-Id": "test-user", "Content-Type": "application/json"}
            created = await client.post(
                "/api/clients",
                headers=ingress,
                json={
                    "client_id": "operator",
                    "display_name": "Operator",
                    "profile": "operator",
                    "capabilities": ["ha.write.services", "ha.write.automations"],
                    "operator_services": ["light.turn_on", "automation.trigger"],
                },
            )
            assert created.status_code == 201
            token = created.json()["token"]
            discovery = await client.get(
                "/api/mcp/discovery",
                headers={**ingress, "Authorization": f"Bearer {token}"},
            )
            assert discovery.status_code == 200
            assert "ha_request_service_approval" in discovery.json()["tools"]
            assert "ha_request_automation_approval" in discovery.json()["tools"]
            mcp_headers = {
                **ingress,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json, text/event-stream",
                "MCP-Protocol-Version": "2025-06-18",
            }
            approval_response = await client.post(
                "/mcp/",
                headers=mcp_headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {
                        "name": "ha_request_service_approval",
                        "arguments": {"target": "light.turn_on", "proposed": {"entity_id": "light.test"}},
                    },
                },
            )
            approval = approval_response.json()["result"]["structuredContent"]
            assert approval["status"] == "approval_required"
            execute_response = await client.post(
                "/mcp/",
                headers=mcp_headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {
                        "name": "ha_execute_service_call",
                        "arguments": {
                            "target": "light.turn_on",
                            "proposed": {"entity_id": "light.test"},
                            "approval_id": approval["approval_id"],
                            "approval_token": approval["approval_token"],
                            "idempotency_key": "test-operator-call-1",
                        },
                    },
                },
            )
            assert execute_response.json()["result"]["structuredContent"]["reason"] == "mutation_adapter_not_configured"

    asyncio.run(run())


def test_operator_service_grant_isolated_per_client(tmp_path) -> None:
    async def run() -> None:
        app = build_app(AppSettings(tmp_path, operator_enabled=True, operator_allowed_services=("light.turn_on",)))
        async with app.router.lifespan_context(app), httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://localhost") as client:
            ingress = {"X-Remote-User-Id": "test-user", "Content-Type": "application/json"}
            created = await client.post("/api/clients", headers=ingress, json={"client_id": "operator-no-grant", "display_name": "Operator", "profile": "operator", "capabilities": ["ha.write.services"], "operator_services": []})
            token = created.json()["token"]
            response = await client.post("/mcp/", headers={**ingress, "Authorization": f"Bearer {token}", "Accept": "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18"}, json={"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "ha_request_service_approval", "arguments": {"target": "light.turn_on", "proposed": {"entity_id": "light.test"}}}})
            assert response.json()["result"]["structuredContent"] == {"status": "denied", "reason": "service_not_granted_to_client"}
    asyncio.run(run())


def test_mcp_public_path_exposes_authorized_todo_get_items_response() -> None:
    async def run() -> None:
        client_record = todo_client()
        bundle = create_mcp_app(
            TodoDiagnostics(),
            lambda token: client_record if token == "operator-token" else None,
            lambda client_id, capability, mutation: PolicyDecision(
                Decision.APPROVAL_REQUIRED if mutation else Decision.ALLOWED,
                "approval_required" if mutation else "read_allowed",
            ),
            home_assistant=object(),
            operator_mutations=TodoOperator(),
            operator_services_ceiling=lambda: ("todo.get_items",),
        )
        app = FastAPI(lifespan=bundle.lifespan)
        app.mount("/mcp", bundle.application)
        headers = {
            "Authorization": "Bearer operator-token",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-06-18",
        }
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://localhost"
        ) as http_client:
            approval = await http_client.post(
                "/mcp/",
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {
                        "name": "ha_request_service_approval",
                        "arguments": {"target": "todo.get_items", "proposed": {"entity_id": "todo.tareas"}},
                    },
                },
            )
            approval_data = approval.json()["result"]["structuredContent"]
            assert approval_data["status"] == "approval_required"

            response = await http_client.post(
                "/mcp/",
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {
                        "name": "ha_execute_service_call",
                        "arguments": {
                            "target": "todo.get_items",
                            "proposed": {"entity_id": "todo.tareas"},
                            "approval_id": approval_data["approval_id"],
                            "approval_token": approval_data["approval_token"],
                            "idempotency_key": "todo-read-1",
                        },
                    },
                },
            )
            assert response.status_code == 200
            assert response.json()["result"]["structuredContent"]["data"]["todo.tareas"]["items"][0]["summary"] == "Buy milk"

    asyncio.run(run())


def test_mcp_public_path_maps_todo_upstream_unavailability_without_leaking_details() -> None:
    async def run() -> None:
        class UnavailableOperator(TodoOperator):
            def execute(self, *args, **kwargs):
                raise HomeAssistantUnavailable(
                    "home_assistant_invalid_service_response",
                    path="/services/todo/get_items",
                    status=200,
                )

        client_record = todo_client()
        bundle = create_mcp_app(
            TodoDiagnostics(),
            lambda token: client_record if token == "operator-token" else None,
            lambda client_id, capability, mutation: PolicyDecision(Decision.APPROVAL_REQUIRED, "approval_required"),
            home_assistant=object(),
            operator_mutations=UnavailableOperator(),
            operator_services_ceiling=lambda: ("todo.get_items",),
        )
        app = FastAPI(lifespan=bundle.lifespan)
        app.mount("/mcp", bundle.application)
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://localhost"
        ) as http_client:
            response = await http_client.post(
                "/mcp/",
                headers={
                    "Authorization": "Bearer operator-token",
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                    "MCP-Protocol-Version": "2025-06-18",
                },
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {
                        "name": "ha_execute_service_call",
                        "arguments": {
                            "target": "todo.get_items",
                            "proposed": {"entity_id": "todo.tareas"},
                            "approval_id": "approval-1",
                            "approval_token": "approval-token",
                            "idempotency_key": "todo-read-2",
                        },
                    },
                },
            )
            structured = response.json()["result"]["structuredContent"]
            assert structured == {
                "status": "unavailable",
                "reason": "home_assistant_unavailable",
                "code": "home_assistant_invalid_service_response",
            }
            assert "/services/todo/get_items" not in str(structured)

    asyncio.run(run())


def test_mcp_shopping_list_authorization_preserves_no_entity_payload_behavior() -> None:
    async def run() -> None:
        client_record = todo_client()
        client_record.client_id = "shopping-operator"
        client_record.operator_services = frozenset({"shopping_list.add_item"})
        bundle = create_mcp_app(
            TodoDiagnostics(),
            lambda token: client_record if token == "operator-token" else None,
            lambda client_id, capability, mutation: PolicyDecision(Decision.APPROVAL_REQUIRED, "approval_required"),
            home_assistant=object(),
            operator_mutations=TodoOperator(),
            operator_services_ceiling=lambda: ("shopping_list.add_item",),
        )
        app = FastAPI(lifespan=bundle.lifespan)
        app.mount("/mcp", bundle.application)
        headers = {
            "Authorization": "Bearer operator-token",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-06-18",
        }
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://localhost"
        ) as http_client:
            response = await http_client.post(
                "/mcp/",
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {
                        "name": "ha_request_service_approval",
                        "arguments": {"target": "shopping_list.add_item", "proposed": {"name": "Milk"}},
                    },
                },
            )
            assert response.status_code == 200
            assert response.json()["result"]["structuredContent"]["status"] == "approval_required"

    asyncio.run(run())
