import asyncio
import re
from datetime import UTC, datetime
from time import monotonic, sleep

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
from homeassistant_gateway.application.development import DevelopmentToolRunner
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer
from homeassistant_gateway.presentation.http import create_app


class FakePortDiagnostics:
    def run(self):
        return {"status": "ok", "checks": []}


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


class FakeHomeAssistant:
    def health(self):
        return True

    def health_details(self):
        return {"status": "ready", "checks": [{"name": "core", "status": "ok", "latency_ms": 1, "http_status": 200, "code": None}]}

    def inventory(self):
        return {"entities": [{"entity_id": "light.kitchen"}], "services": [], "counts": {"entities": 1, "services": 0}}

    def states(self, entity_id=None):
        return [{"entity_id": entity_id or "light.kitchen", "state": "on"}]

    def automations(self):
        return [{"entity_id": "automation.test", "state": "on"}]

    def automation_config(self, entity_id=None):
        return {"entity_id": entity_id or "automation.test", "configuration": {"trigger": [], "action": []}, "yaml": "trigger: []\naction: []\n", "findings": []}

    def configuration(self):
        return {"core": {}, "entity_registry": [], "area_registry": []}

    def services(self):
        return []

    def events(self):
        return []

    def history(self, entity_id=None, start_time=None):
        return []

    def logbook(self, entity_id=None, start_time=None):
        return []

    def extended_read(self, resource):
        return [{"resource": resource}]

    def ui_context(self):
        return {"locale": "es", "theme": "light"}

def make_app(audit_sink=None, home_assistant=None, development_console_enabled=True):
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
        home_assistant=home_assistant,
        development_runner=DevelopmentToolRunner(home_assistant, FakePortDiagnostics()) if home_assistant else None,
        development_console_enabled=development_console_enabled,
    )


def request(app, method: str, url: str, json=None, headers=None) -> httpx.Response:
    async def perform() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, url, json=json, headers=headers)

    return asyncio.run(perform())


def ingress_headers() -> dict[str, str]:
    return {"X-Remote-User-Id": "test-user"}


def test_development_catalog_requires_ingress_and_lists_probes() -> None:
    app = make_app(home_assistant=FakeHomeAssistant())
    assert request(app, "GET", "/api/development/catalog").status_code == 401
    response = request(app, "GET", "/api/development/catalog", headers=ingress_headers())
    assert response.status_code == 200
    assert response.json()["enabled"] is True
    assert len(response.json()["operations"]) == 19
    assert len(response.json()["packs"]) == 4
    assert response.json()["mutations"]["status"] == "disabled"


def test_ui_context_is_ingress_protected_and_returns_ha_preferences() -> None:
    app = make_app(home_assistant=FakeHomeAssistant())
    assert request(app, "GET", "/api/ui/context").status_code == 401
    response = request(app, "GET", "/api/ui/context", headers=ingress_headers())
    assert response.status_code == 200
    assert response.json() == {"locale": "es", "theme": "light"}


def test_health_details_is_ingress_protected_and_reports_checks() -> None:
    app = make_app(home_assistant=FakeHomeAssistant())
    assert request(app, "GET", "/api/health/details").status_code == 401
    response = request(app, "GET", "/api/health/details", headers=ingress_headers())
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["checks"][0]["name"] == "core"


def test_development_run_all_returns_one_result_per_probe() -> None:
    app = make_app(home_assistant=FakeHomeAssistant())
    response = request(
        app,
        "POST",
        "/api/development/run",
        headers=ingress_headers(),
        json={"operation": "all", "parameters": {}},
    )
    assert response.status_code == 202
    queued = response.json()
    assert queued["status"] == "queued"
    assert response.headers["location"] == f"/api/development/jobs/{queued['job_id']}"
    assert request(app, "GET", response.headers["location"]).status_code == 401
    deadline = monotonic() + 2
    payload = None
    while monotonic() < deadline:
        result_response = request(app, "GET", f"/api/development/jobs/{queued['job_id']}", headers=ingress_headers())
        payload = result_response.json()
        if payload["status"] in {"completed", "warning", "error"}:
            break
        sleep(0.01)
    assert payload is not None
    assert payload["status"] == "warning"
    assert len(payload["results"]) == 19
    assert {item["status"] for item in payload["results"]} == {"ok", "warning"}
    assert all(item.get("reason") == "empty_result" for item in payload["results"] if item["status"] == "warning")


def test_development_console_can_be_disabled_without_affecting_health() -> None:
    app = make_app(home_assistant=FakeHomeAssistant(), development_console_enabled=False)
    response = request(app, "POST", "/api/development/run", headers=ingress_headers(), json={"operation": "states"})
    assert response.status_code == 403
    assert request(app, "GET", "/health").status_code == 200


def test_operator_preview_requires_ingress_and_never_executes() -> None:
    app = make_app(home_assistant=FakeHomeAssistant())
    payload = {"operation": "ha.call_service", "target": "light.kitchen", "capability": "ha.write.services", "proposed": {"state": "on"}, "current": {"state": "off"}}
    assert request(app, "POST", "/api/operator/preview", json=payload).status_code == 401
    response = request(app, "POST", "/api/operator/preview", headers=ingress_headers(), json=payload)
    assert response.status_code == 200
    assert response.json()["decision"] == "approval_required"
    assert response.json()["execution"] == "disabled"


def test_ingress_responses_include_security_headers() -> None:
    response = request(make_app(), "GET", "/", headers=ingress_headers())
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["content-security-policy"].startswith("default-src 'self'")


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
    assert len(response.json()["tools"]) == 19
    assert "ha_history" in response.json()["tools"]
    assert "ha_logbook" in response.json()["tools"]
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
