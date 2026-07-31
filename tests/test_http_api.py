import asyncio
from datetime import UTC, datetime

import httpx

from homeassistant_gateway.application.clients import IssueClient, ListClients, RevokeClient
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer
from homeassistant_gateway.presentation.http import create_app


class InMemoryClientRepository:
    def __init__(self) -> None:
        self.items = {}

    def list(self):
        return list(self.items.values())

    def get(self, client_id):
        return self.items.get(client_id)

    def save(self, client):
        self.items[client.client_id] = client


def make_app():
    repository = InMemoryClientRepository()
    tokens = SecureTokenIssuer()
    clock = lambda: datetime(2026, 7, 31, tzinfo=UTC)
    return create_app(
        issue_client=IssueClient(repository, tokens, clock, operator_enabled=False),
        list_clients=ListClients(repository),
        revoke_client=RevokeClient(repository, clock),
    )


def request(app, method: str, url: str, json=None) -> httpx.Response:
    async def perform() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, url, json=json)

    return asyncio.run(perform())


def test_health_endpoint_is_publicly_safe() -> None:
    response = request(make_app(), "GET", "/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_client_creation_returns_plaintext_token_once_without_digest() -> None:
    app = make_app()
    response = request(
        app,
        "POST",
        "/api/clients",
        json={
            "client_id": "observer",
            "display_name": "Observer",
            "profile": "observer",
            "capabilities": ["ha.read.states"],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["client_id"] == "observer"
    assert body["token"].startswith("hgw_")
    assert "token_digest" not in body

    listed = request(app, "GET", "/api/clients")
    assert listed.status_code == 200
    assert listed.json()[0]["status"] == "active"
    assert "token_digest" not in listed.json()[0]


def test_duplicate_client_is_conflict_and_revoke_is_idempotent() -> None:
    app = make_app()
    payload = {
        "client_id": "observer",
        "display_name": "Observer",
        "profile": "observer",
        "capabilities": ["ha.read.states"],
    }
    assert request(app, "POST", "/api/clients", json=payload).status_code == 201
    assert request(app, "POST", "/api/clients", json=payload).status_code == 409

    assert request(app, "POST", "/api/clients/observer/revoke").status_code == 204
    assert request(app, "POST", "/api/clients/observer/revoke").status_code == 204
    assert request(app, "GET", "/api/clients").json()[0]["status"] == "revoked"
