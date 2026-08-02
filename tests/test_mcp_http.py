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
        app = build_app(AppSettings(tmp_path))
        async with app.router.lifespan_context(app), httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://localhost",
        ) as client:
            response = await client.post(
                "/mcp/",
                headers={
                    "Content-Type": "application/json",
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
