import asyncio
import re
from datetime import UTC, datetime

import httpx

from homeassistant_gateway.application.audit import AuditEvent
from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.clients import (
    IssueClient,
    ListClients,
    RevokeClient,
    RotateClient,
)
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer
from homeassistant_gateway.presentation.http import create_app


class InMemoryClientRepository:
    def __init__(self) -> None:
        self.items = {}

    def list(self):
        return list(self.items.values())

    def get(self, client_id):
        return self.items.get(client_id)

    def find_by_token_digest(self, token_digest):
        return next(
            (client for client in self.items.values() if client.token_digest == token_digest),
            None,
        )

    def save(self, client):
        self.items[client.client_id] = client


class AuditRecorder:
    def __init__(self) -> None:
        self.events: list[AuditEvent] = []

    def record(self, event: AuditEvent) -> None:
        self.events.append(event)

    def list(self, limit=100, decision=None):
        events = [event for event in self.events if decision is None or event.decision == decision]
        return events[:limit]


def make_app(audit_sink=None):
    repository = InMemoryClientRepository()
    tokens = SecureTokenIssuer()
    clock = lambda: datetime(2026, 7, 31, tzinfo=UTC)
    return create_app(
        issue_client=IssueClient(repository, tokens, clock, operator_enabled=False),
        list_clients=ListClients(repository),
        revoke_client=RevokeClient(repository, clock),
        rotate_client=RotateClient(repository, tokens),
        authenticate_client=AuthenticateClient(repository, tokens),
        authorize_request=AuthorizeRequest(repository, operator_enabled=False),
        audit_sink=audit_sink,
        audit_reader=audit_sink,
    )


def request(app, method: str, url: str, json=None, headers=None) -> httpx.Response:
    async def perform() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, url, json=json, headers=headers)

    return asyncio.run(perform())


def ingress_headers() -> dict[str, str]:
    return {"X-Remote-User-Id": "test-user"}


def test_health_endpoint_is_publicly_safe() -> None:
    response = request(make_app(), "GET", "/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert re.fullmatch(r"[a-f0-9]{32}", response.headers["x-request-id"])


def test_ingress_index_serves_gateway_shell() -> None:
    response = request(make_app(), "GET", "/", headers=ingress_headers())

    assert response.status_code == 200
    assert "Secure gateway control plane" in response.text
    assert "fetch(new URL('ready'" in response.text


def test_readiness_endpoint_is_public_and_reports_composition_state() -> None:
    response = request(make_app(), "GET", "/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "storage": "ready", "mcp": "disabled", "home_assistant": "disabled"}


def test_request_id_is_bounded_and_returned_for_ingress_requests() -> None:
    response = request(
        make_app(),
        "GET",
        "/api/clients",
        headers={**ingress_headers(), "X-Request-ID": "external-42"},
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "external-42"


def test_http_request_is_audited_without_payload_or_secret() -> None:
    recorder = AuditRecorder()
    response = request(
        make_app(recorder),
        "GET",
        "/api/clients",
        headers={**ingress_headers(), "X-Request-ID": "audit-42"},
    )

    assert response.status_code == 200
    assert len(recorder.events) == 1
    event = recorder.events[0]
    assert event.request_id == "audit-42"
    assert event.remote_user_id == "test-user"
    assert event.target == "/api/clients"
    assert event.decision == "allowed"
    assert event.outcome == "success"


def test_policy_evaluation_returns_decision_without_executing_operation() -> None:
    app = make_app()
    create_response = request(
        app,
        "POST",
        "/api/clients",
        headers=ingress_headers(),
        json={
            "client_id": "observer",
            "display_name": "Observer",
            "profile": "observer",
            "capabilities": ["ha.read.states"],
        },
    )
    assert create_response.status_code == 201

    response = request(
        app,
        "POST",
        "/api/policy/evaluate",
        headers=ingress_headers(),
        json={
            "client_id": "observer",
            "capability": "ha.read.states",
            "mutation": False,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"decision": "allowed", "reason": "read_allowed"}


def test_audit_endpoint_returns_sanitized_events_and_filters_decision() -> None:
    recorder = AuditRecorder()
    response = request(make_app(recorder), "GET", "/api/clients", headers=ingress_headers())
    assert response.status_code == 200

    events = request(make_app(recorder), "GET", "/api/audit?limit=10&decision=allowed", headers=ingress_headers())
    assert events.status_code == 200
    assert events.json()[0]["target"] == "/api/clients"
    assert "token" not in events.text.lower()


def test_client_rotation_replaces_old_bearer_material() -> None:
    app = make_app()
    created = request(
        app,
        "POST",
        "/api/clients",
        headers=ingress_headers(),
        json={"client_id": "rotatable", "display_name": "Rotatable", "profile": "observer", "capabilities": ["ha.read.states"]},
    )
    old_token = created.json()["token"]

    rotated = request(app, "POST", "/api/clients/rotatable/rotate", headers=ingress_headers())
    assert rotated.status_code == 201
    new_token = rotated.json()["token"]
    assert new_token != old_token
    old_headers = {**ingress_headers(), "Authorization": f"Bearer {old_token}"}
    new_headers = {**ingress_headers(), "Authorization": f"Bearer {new_token}"}
    assert request(app, "GET", "/api/client/me", headers=old_headers).status_code == 401
    assert request(app, "GET", "/api/client/me", headers=new_headers).status_code == 200


def test_observer_mutation_is_denied_by_capability_policy() -> None:
    app = make_app()
    create_response = request(
        app,
        "POST",
        "/api/clients",
        headers=ingress_headers(),
        json={
            "client_id": "observer",
            "display_name": "Observer",
            "profile": "observer",
            "capabilities": ["ha.read.states"],
        },
    )
    assert create_response.status_code == 201

    response = request(
        app,
        "POST",
        "/api/policy/evaluate",
        headers=ingress_headers(),
        json={
            "client_id": "observer",
            "capability": "ha.read.states",
            "mutation": True,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"decision": "denied", "reason": "observer_is_read_only"}


def test_client_identity_requires_and_resolves_bearer_token() -> None:
    app = make_app()
    create_response = request(
        app,
        "POST",
        "/api/clients",
        headers=ingress_headers(),
        json={
            "client_id": "observer",
            "display_name": "Observer",
            "profile": "observer",
            "capabilities": ["ha.read.states"],
        },
    )
    token = create_response.json()["token"]

    response = request(
        app,
        "GET",
        "/api/client/me",
        headers={**ingress_headers(), "Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["client_id"] == "observer"
    assert "token_digest" not in response.json()


def test_client_identity_rejects_invalid_bearer_token() -> None:
    response = request(
        make_app(),
        "GET",
        "/api/client/me",
        headers={**ingress_headers(), "Authorization": "Bearer hgw_invalid"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_client_token"}


def test_mcp_discovery_returns_only_client_scoped_metadata() -> None:
    app = make_app()
    create_response = request(
        app,
        "POST",
        "/api/clients",
        headers=ingress_headers(),
        json={
            "client_id": "observer",
            "display_name": "Observer",
            "profile": "observer",
            "capabilities": ["ha.read.diagnostics"],
        },
    )
    token = create_response.json()["token"]

    response = request(
        app,
        "GET",
        "/api/mcp/discovery",
        headers={**ingress_headers(), "Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["endpoint"] == "/mcp/"
    assert response.json()["tools"] == ["gateway_diagnostics"]
    assert "token" not in response.json()
    assert "token_digest" not in response.json()


def test_mcp_discovery_rejects_missing_client_token() -> None:
    response = request(make_app(), "GET", "/api/mcp/discovery", headers=ingress_headers())

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_client_token"}


def test_api_requires_supervisor_ingress_identity() -> None:
    response = request(make_app(), "GET", "/api/clients")

    assert response.status_code == 401
    assert response.json() == {"detail": "ingress_identity_required"}


def test_client_creation_returns_plaintext_token_once_without_digest() -> None:
    app = make_app()
    response = request(
        app,
        "POST",
        "/api/clients",
        headers=ingress_headers(),
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

    listed = request(app, "GET", "/api/clients", headers=ingress_headers())
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
    assert request(app, "POST", "/api/clients", headers=ingress_headers(), json=payload).status_code == 201
    assert request(app, "POST", "/api/clients", headers=ingress_headers(), json=payload).status_code == 409

    assert request(app, "POST", "/api/clients/observer/revoke", headers=ingress_headers()).status_code == 204
    assert request(app, "POST", "/api/clients/observer/revoke", headers=ingress_headers()).status_code == 204
    assert request(app, "GET", "/api/clients", headers=ingress_headers()).json()[0]["status"] == "revoked"
