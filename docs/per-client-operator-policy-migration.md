# Per-client Operator Service Policy Migration

## Goal

Move the operator service allowlist from one global gateway policy to an explicit grant set attached to each client credential. Keep `operator_enabled` as the global safety switch.

## Target contract

- `operator_enabled=false`: no operator client can be created or mutate.
- `operator_enabled=true`: operator clients may exist, but each credential receives only its own capabilities and service grants.
- Observer credentials cannot receive write capabilities or service grants.
- A mutation is authorized only when the requesting client is active, has the required write capability, and its own service grant contains the exact `domain.service` operation.
- Approval, expiry, replay protection, idempotency, target/payload validation and audit remain mandatory.
- An empty per-client grant set means no write services for that credential.
- `*` is never accepted.

## Migration phases

1. **Contract and storage**: add a bounded `operator_services` field to the client model and persist it in an additive JSON column. Existing global services remain only as a deprecated compatibility seed; new clients default to an empty set.
2. **Runtime enforcement**: carry `client_id` through preview, approval and execution. Resolve the requesting client's grants at execution time. Do not use a process-global allowlist for authorization.
3. **HTTP/MCP contracts**: expose grants in client responses to the authenticated GUI and ensure MCP discovery is derived from that client's capabilities/grants. A dedicated update route for existing credentials remains the next incremental slice.
4. **GUI**: configure services inside each client editor. Show the effective grant count and descriptions, with separate Hermes/OpenClaw credentials. Do not present a global service selector as authoritative.
5. **Compatibility and removal**: retain the legacy global setting as a deprecated migration input for one release. It seeds existing operator clients once, is never applied to observers, and is not used for new authorization decisions. Remove the legacy setting after migration evidence and documentation.

## Safety and rollback

- Schema changes are additive and SQLite-compatible.
- Existing clients remain readable.
- A failed migration leaves the old global policy available as a seed and does not broaden permissions.
- Rollback is disabling `operator_enabled` or revoking the affected client; no Home Assistant mutation is run automatically during migration.
- Tests must prove Hermes grants do not authorize OpenClaw and vice versa.

## Verification gates

- Unit tests for normalization, persistence, migration and denial paths.
- HTTP contract tests for per-client read/update authorization.
- MCP discovery tests for isolated clients.
- Frontend type, runtime, UX, build and Playwright checks.
- Full non-live coverage threshold remains at least 85%.
- CI, multi-architecture image, scan and artifact smoke must pass before release.
