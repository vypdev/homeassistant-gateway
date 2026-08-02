# Home Assistant Gateway

Home Assistant-native MCP gateway for safe, auditable access to the full Home Assistant installation.

The project is designed to run **inside Home Assistant** as a custom integration/add-on boundary, with a native configuration UI and explicit security profiles:

- **Observer**: read-only inventory, state, configuration metadata, automations, scripts, areas, devices, services, diagnostics, and audit views.
- **Operator**: narrowly scoped mutations, disabled by default, requiring explicit authorization, policy checks, confirmation, and audit logging.

The gateway is intended to be consumed by OpenClaw and Hermes through MCP without exposing Home Assistant credentials to either client.

## Development Console

The Ingress UI includes a first-level **Development Console**. It is an internal verification surface, not an MCP endpoint. It runs the same bounded read adapter used by observer tools and reports, per probe:

- operation and upstream status;
- item count;
- elapsed time;
- sanitized payload or explicit failure category;
- aggregate results from `Run all`.

The current probes cover inventory, states, automations, configuration/registries, services, events, history, logbook, devices, areas, floors, labels, entity registry, scripts, scenes, helpers and derived integrations. Four packs are available: Basic Inventory, Automation Diagnostics, MCP Readiness and Data Completeness. Entity and start-time filters are available where Home Assistant supports them.

Each execution stores sanitized evidence in the private SQLite database with a schema fingerprint, duration, aggregate count and comparison against the previous run. Historical evidence is visible in the console without exposing credentials, headers, query strings or request bodies.

Mutation probes are shown as blocked and require the separate operator design: target allowlist, validated diff, approval token, idempotency key, audit before/after, and rollback. The console never enables MCP mutations by itself.

Disable it with the App option `development_console_enabled: false` or `GATEWAY_DEVELOPMENT_CONSOLE_ENABLED=false`.

The Supervisor App exposes the management UI through Ingress and also publishes the read-only MCP transport on the Home Assistant host port `18099` for native MCP clients such as Hermes. Connect to `http://<home-assistant-host>:18099/mcp/` with an observer client Bearer token. No operator mutation is enabled yet; operator mutations remain disabled and no write tools are registered.


## Design goals

- Run close to Home Assistant and use its authenticated internal APIs/services.
- Provide a native Home Assistant config flow and frontend panel for setup and policy management.
- Keep credentials in Home Assistant-managed secure storage; never place them in MCP prompts, logs, Git, or client configuration.
- Expose a stable, bounded MCP contract instead of proxying arbitrary Home Assistant APIs.
- Make observer access useful enough for full analysis: entities, devices, areas, automations, scripts, scenes, services, helpers, integrations, configuration metadata, and diagnostics.
- Separate observer and operator capabilities at the policy boundary.
- Require explicit approval and idempotency checks for mutations.
- Preserve Clean Architecture boundaries and test the policy before integrating transports.

## Proposed runtime

```text
Home Assistant
└── custom_components/homeassistant_gateway
    ├── config flow + frontend panel
    ├── policy engine
    ├── credential/storage adapter
    ├── read model and HA service adapters
    ├── audit store
    └── MCP transport adapter

OpenClaw / Hermes
└── authenticated MCP client
    ├── observer profile by default
    └── operator profile only when explicitly provisioned
```

The management UI is a real Lit + TypeScript + Vite frontend served as static assets by FastAPI. It provides overview/readiness, clients, one-time token issuance, revocation, rotation, profiles/policy, MCP discovery and sanitized audit views.

The App can use the Supervisor-provided Home Assistant API through a bounded read-only adapter. The current MCP observer tools are `gateway_diagnostics`, `ha_inventory`, `ha_states`, `ha_automations`, and `ha_configuration`; each requires an explicit capability.

## Security posture

- Default bind: Home Assistant-local or loopback boundary.
- Default profile: observer/read-only.
- Operator profile: separate policy, separate client identity, explicit enablement, short-lived authorization where possible.
- No arbitrary shell, Docker socket, SSH, filesystem browsing, or transparent API proxy.
- Every mutation: allowlist check → validation → confirmation/approval → execution → audit event.
- Audit records contain actor, tool, target, action, result, timestamp, and correlation ID, never secrets.

See [`docs/architecture.md`](docs/architecture.md), [`docs/security-model.md`](docs/security-model.md), and [`docs/roadmap.md`](docs/roadmap.md).

## Development

The repository currently contains the architecture contract and integration skeleton. Implementation slices will be added behind tests, starting with policy and read-only discovery before any operator mutation.

```bash
python -m pytest
```

## License

MIT. See [`LICENSE`](LICENSE).
