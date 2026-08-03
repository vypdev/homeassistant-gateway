import asyncio

import httpx

from homeassistant_gateway.composition import AppSettings, build_app


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
