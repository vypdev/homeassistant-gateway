# Frontend and credential-management contract

The App UI is served through Home Assistant Supervisor Ingress. It must not require a second public port for normal use.

## Views

- Overview: App health, MCP readiness, Home Assistant connectivity, active profile, and last audit event.
- Clients: client IDs, display names, profile, capabilities, created/last-used/expiry metadata, and revocation status.
- Issue token: one-time token display, explicit confirmation, expiry, scope selection, and no recovery after leaving the page.
- Policies: observer/operator profiles, capability allowlists, target restrictions, approval mode, and emergency disable.
- Audit: filtered append-only events with redacted targets and safe error codes.
- Diagnostics: connectivity, API version, supported capabilities, queue state, and redaction status.

## Credential rules

- Home Assistant credentials are never shown after creation.
- MCP client tokens are shown only once and stored as hashes where possible.
- Revocation is immediate and auditable.
- Operator client creation is controlled by the effective `/api/operator/status` policy gate; mutation execution remains disabled independently.
- The UI cannot grant a capability that the server policy does not recognize.

## Ingress

## Capability selector

- Client provisioning uses a grouped checklist instead of a comma-separated free-text field. Each capability shows its stable identifier and a human-readable description. The observer preset selects the complete read-only catalog, while operator capabilities remain unavailable for execution until their mutation contracts are activated.

The UI still submits the explicit `string[]` capability contract to the API. The client token therefore receives only the checked capabilities; no capability is inferred from a display name or prompt.

The server must honor the ingress base path and forwarded headers. It must not construct absolute URLs from an assumed `/` root. WebSocket and SSE endpoints must be tested through ingress, not only through localhost.
