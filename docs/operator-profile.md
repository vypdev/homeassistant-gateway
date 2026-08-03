# Operator profile

## Current status

The operator profile is **implemented as a disabled safety framework**. The gateway does not register Home Assistant mutation tools and does not execute service calls, automation updates or configuration writes.

The observer profile remains the production capability. Reading automation configuration through `ha_automation_config` is read-only and does not activate the operator profile.

The following Ingress endpoint reports the effective state:

```text
GET /api/operator/status
```

Its current contract reports:

```json
{
  "profile": "operator",
  "operator_enabled": false,
  "execution": "disabled",
  "registered_mutation_tools": [],
  "capabilities": [],
  "reason": "operator_mutations_not_implemented"
}
```

## Architecture

Operator code is split into small boundaries:

- `application/operator_security.py` — capabilities, bounded approval grants, one-time token consumption, emergency control and idempotency reservations;
- `application/operator_mutations.py` — typed mutation port, validation, previews and execution gate;
- `application/operator_preview.py` — compatibility preview contract used by the Development Console;
- `domain/policy.py` — observer/operator authorization decisions;
- `presentation/development_routes.py` — Ingress status and preview endpoints;
- infrastructure adapters — intentionally absent for writes in this release.

Application code does not import HTTP clients, Home Assistant transport details or filesystem paths.

## Security invariants

A future mutation must satisfy all of these checks before an infrastructure adapter can be called:

1. operator mode is globally enabled;
2. the client is an active operator client;
3. the capability is explicitly allowlisted;
4. the operation and target pass typed validation;
5. the proposed state has a bounded structural diff;
6. an unexpired, one-time approval grant matches the exact proposal;
7. an unused idempotency key matches the exact request;
8. the infrastructure mutation port exists for that operation;
9. the operation has a documented rollback classification;
10. an audit event is recorded with sanitized fields.

The emergency control can disable operator execution without disabling observer reads. Approval tokens are stored only as digests, are bounded in memory and are single-use. Idempotency reservations reject replay and payload reuse.

## Home Assistant contract research

The official Home Assistant documentation confirms:

- REST API: <https://developers.home-assistant.io/docs/api/rest/>;
- WebSocket API: <https://developers.home-assistant.io/docs/api/websocket/>;
- WebSocket extension model: <https://developers.home-assistant.io/docs/frontend/extending/websocket-api/>.

A service call is a state-changing operation and must use an explicitly verified Home Assistant service contract. The Gateway must not accept arbitrary domain/service strings or arbitrary targets.

Automation configuration editing is more sensitive. The Home Assistant Core/frontend implementation uses configuration-oriented WebSocket and frontend contracts that are version-dependent; the generic REST API documentation does not define a stable public CRUD contract for arbitrary automation source. Therefore this repository does **not** implement automation mutation yet. It must first pin and test the exact contract for the installed Home Assistant version and preserve structured configuration instead of editing `/config/automations.yaml` or `.storage` directly.

## Activation gates

No operator mutation may be enabled until all gates below have evidence:

- official contract captured for the target Home Assistant version;
- typed request/response models and target allowlists;
- dry-run and before/after diff;
- one-time approval and replay protection;
- idempotency handling;
- bounded execution timeout;
- explicit rollback or irreversible-operation warning;
- sanitized audit persistence;
- emergency disable test;
- unit, ASGI, adapter and live tests;
- published artifact verification;
- explicit live Home Assistant verification with no unrelated entities targeted.

The first candidate should be one narrow, reversible service operation in an isolated test target. Automation editing and general configuration writes must remain disabled until their contracts are independently verified.

## Non-goals

The operator profile does not provide:

- arbitrary shell, Python or Docker access;
- direct filesystem access to Home Assistant configuration;
- transparent proxying of the Home Assistant API;
- default operator activation;
- automatic execution based on natural-language intent;
- mutation tools hidden behind an observer capability.
