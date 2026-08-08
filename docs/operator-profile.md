# Operator profile

## Current status

The operator profile is implemented as an explicit, approval-gated execution path.
Stable and Edge keep it disabled by default. When enabled, the gateway can expose
allowlisted Home Assistant service and automation controls only to operator
clients with the matching capability and explicit service grants. Every mutation
requires a short-lived approval and a single-use execution token.

The observer profile remains the default production capability. Reading
automation configuration through `ha_automation_config` is read-only and does
not activate the operator profile.

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
  "reason": "mutation_execution_disabled"
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

The application ports now support a SQLite-backed operator state adapter. It persists approval metadata, token digests, consumed state and idempotency fingerprints with private database permissions; plaintext approval tokens and proposed payloads are never stored. The adapter is connected to the bounded mutation routes when operator execution is enabled.

The Ingress-only HTTP boundary exposes `POST /api/operator/approval` and `POST /api/operator/execute`. Both reject requests with `403 operator_disabled` while the global flag is false. If the flag is enabled without a mutation adapter, execution remains bounded and returns `mutation_adapter_not_configured`; MCP mutation tools are discovered only when the global policy and client grants allow them.

## Home Assistant contract research

The official Home Assistant documentation confirms:

- REST API: <https://developers.home-assistant.io/docs/api/rest/>;
- WebSocket API: <https://developers.home-assistant.io/docs/api/websocket/>;
- WebSocket extension model: <https://developers.home-assistant.io/docs/frontend/extending/websocket-api/>.

A service call is a state-changing operation and must use an explicitly verified Home Assistant service contract. The Gateway must not accept arbitrary domain/service strings or arbitrary targets.

The operator service-call path is wired through `SupervisorServiceMutationAdapter` only when `operator_enabled` is true. The graphical Operator services policy is a persisted global **permission ceiling**: it defines which services may be granted, but it does not grant them to any client. Each operator credential must also contain the concrete service in its own `operator_services` grant set. Effective authorization is the intersection of the global ceiling and the credential grants, followed by capability, target, payload and approval checks. The adapter sends a bounded JSON payload to `/services/<domain>/<service>`, classifies upstream failures and redacts returned state data. Automation control is restricted to the official `automation.trigger`, `automation.turn_on` and `automation.turn_off` services. An empty policy keeps mutation tools unavailable.

Configure the global operator switch in the add-on options. Then open the Gateway **Policy** view, review the live Home Assistant service catalog and select the services that may be granted to operator credentials. This screen is not a client grant editor. The individual client editor must grant the selected services to each credential separately; a client with no grant remains read-only. The GUI shows the global ceiling summary before the catalog and explains that every mutation still requires approval.

The operator client must be created with the matching `ha.write.services` or `ha.write.automations` capability. Every mutation requires a short-lived approval, a single-use approval token, an idempotency key and a bearer-authenticated operator client. Generic configuration writes are not exposed because Home Assistant does not provide a bounded official write contract for arbitrary configuration data.

Generic automation source editing remains intentionally unsupported. The bounded automation controls above only call the official automation services; they do not modify triggers, conditions or actions. Editing `/config/automations.yaml` or `.storage` directly is prohibited.

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
