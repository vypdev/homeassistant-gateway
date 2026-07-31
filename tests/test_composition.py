import asyncio
from pathlib import Path

import httpx

from homeassistant_gateway.composition import AppSettings, build_app


def request(app, method: str, url: str, json=None) -> httpx.Response:
    async def perform() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(
                method,
                url,
                json=json,
                headers={"X-Remote-User-Id": "test-user"},
            )

    return asyncio.run(perform())


def test_composition_root_persists_client_between_app_instances(tmp_path: Path) -> None:
    settings = AppSettings(data_dir=tmp_path, operator_enabled=False)
    app = build_app(settings)
    payload = {
        "client_id": "observer",
        "display_name": "Observer",
        "profile": "observer",
        "capabilities": ["ha.read.states"],
    }

    created = request(app, "POST", "/api/clients", json=payload)
    restarted = build_app(settings)

    assert created.status_code == 201
    assert request(restarted, "GET", "/api/clients").json()[0]["client_id"] == "observer"


def test_composition_root_does_not_enable_operator_by_default(tmp_path: Path) -> None:
    app = build_app(AppSettings(data_dir=tmp_path))
    payload = {
        "client_id": "operator",
        "display_name": "Operator",
        "profile": "operator",
        "capabilities": ["ha.operator.service_call"],
    }

    response = request(app, "POST", "/api/clients", json=payload)

    assert response.status_code == 403
    assert response.json() == {"detail": "operator_disabled"}
