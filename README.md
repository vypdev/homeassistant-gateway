# Home Assistant Gateway

Home Assistant-native MCP gateway for safe, auditable access to the full Home Assistant installation.

The project is designed to run **inside Home Assistant** as a custom integration/add-on boundary, with a native configuration UI and explicit security profiles:

- **Observer**: read-only inventory, state, configuration metadata, automations, scripts, areas, devices, services, diagnostics, and audit views.
- **Operator**: narrowly scoped mutations, disabled by default, requiring explicit authorization, policy checks, confirmation, and audit logging.

The gateway is intended to be consumed by OpenClaw and Hermes through MCP without exposing Home Assistant credentials to either client.

## Status

Architecture and integration contract phase. No operator mutation is enabled yet.

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

The first implementation target is a Supervisor-managed Home Assistant App installed from this GitHub repository. It starts with Home Assistant and serves its management UI through Ingress. A companion custom integration may be added later for native entities/services, but it is not the primary MCP server boundary.

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
