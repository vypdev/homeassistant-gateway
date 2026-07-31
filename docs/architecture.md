# Architecture

## Scope

`homeassistant-gateway` is a Home Assistant-native integration that exposes a curated MCP interface for inspection and, only when explicitly enabled, controlled operation.

It is not a generic HTTP proxy, shell bridge, Docker controller, or replacement for Home Assistant's authorization model.

## Layers

```text
custom_components/homeassistant_gateway/presentation
  Home Assistant config flow, panel, MCP tool schemas, response DTOs
              ↓
application
  discovery, analysis, policy evaluation, approval, mutation use cases
              ↓
domain
  profiles, capabilities, authorization decisions, audit events, safe identifiers
              ↑
infrastructure
  Home Assistant service/state adapters, secure storage, audit persistence, MCP server
              ↑
composition
  integration setup and dependency wiring only
```

Dependency direction points inward. Domain and application code must not import Home Assistant, HTTP, MCP, subprocess, filesystem, or vendor-specific modules.

- Domain code contains policies, capabilities, identifiers, and decisions. The first domain slice is `src/homeassistant_gateway/domain/policy.py`.
- The first implemented application slice is `src/homeassistant_gateway/application/clients.py`: issue, list, and revoke client use cases through injected repository/token/clock ports.
- Plaintext tokens are returned only in the one-time `IssuedClient` result; the application persists only a token digest through the injected repository boundary.
- Infrastructure now provides `SecureTokenIssuer` and `SQLiteClientRepository`; both are adapters behind application ports.
- SQLite lives in the App's private data directory, creates its parent with mode `0700`, and keeps the database at mode `0600`.

## Home Assistant deployment shape

### Primary: Home Assistant App (formerly add-on)

The primary distribution is a Home Assistant App installed from the project's GitHub repository through Supervisor. This is the correct boundary for a long-running MCP server that must start with Home Assistant and expose its own web UI.

The App provides:

- automatic startup and Supervisor lifecycle management;
- an Ingress-protected web UI;
- MCP transport bound to a local/protected interface;
- client identities, token issuance, revocation, profiles, capabilities, and audit storage;
- a narrow Home Assistant API/WebSocket adapter using the Supervisor-provided Home Assistant access boundary;
- health/readiness endpoints and safe diagnostics.

The App must not expose a public unauthenticated port by default. No Docker socket access is required.

### Optional: companion custom integration

A companion custom integration may be added later for native Home Assistant registration, entities, services, config flow/options flow, and a sidebar panel. It is not the primary credential or MCP server boundary. Keeping the long-running server in an App avoids embedding an HTTP/MCP server lifecycle inside Home Assistant Core.

### Configuration and raw files

The supported read model uses Home Assistant's authenticated REST/WebSocket APIs first. Raw `/config` access is not enabled by default because it can expose `secrets.yaml`, `.storage`, tokens, and private topology. A future narrowly scoped configuration-inspection capability may read selected files through an explicit allowlist, redaction pipeline, and separate policy gate; it must never expose the raw configuration directory.

## Capability model

Capabilities are explicit, versioned identifiers, for example:

- `ha.read.states`
- `ha.read.entities`
- `ha.read.devices`
- `ha.read.areas`
- `ha.read.automations`
- `ha.read.scripts`
- `ha.read.scenes`
- `ha.read.services`
- `ha.read.config_entries`
- `ha.read.diagnostics`
- `ha.operator.automation_update`
- `ha.operator.service_call`

The observer profile may include only `ha.read.*`. Operator capabilities are never implied by profile name alone; each client identity receives an explicit capability set.

## MCP contract

The MCP layer exposes bounded tools grouped by intent rather than raw Home Assistant internals:

1. `ha_inventory`: complete, paginated-safe inventory of areas, devices, entities, integrations, and services.
2. `ha_states`: filtered state read with stable identifiers and redacted attributes.
3. `ha_automations`: automation definitions, triggers, conditions, actions, mode, and enabled state.
4. `ha_configuration`: safe configuration metadata and integration diagnostics without secrets.
5. `ha_analysis_context`: a consistent read snapshot for analysis workflows.
6. Operator tools are added only after the observer contract and approval model are verified.

Every tool has a schema, capability requirement, timeout, output-size limit, redaction rule, and audit classification.

## Credential flow

1. User opens Home Assistant's integration UI.
2. Config flow validates the target/authentication method without printing secret material.
3. Credentials are stored through a dedicated Home Assistant storage adapter.
4. The UI shows presence and rotation status, never the secret value.
5. MCP clients authenticate with a client identity/profile, not with the upstream Home Assistant credential.
6. Rotation revokes old client material and emits an audit event.

## Analysis model

Analysis must use a bounded read snapshot, not an unconstrained sequence of calls. The gateway should provide:

- a consistent snapshot identifier;
- collection timestamps and source availability;
- redaction and completeness metadata;
- pagination and truncation indicators;
- explicit unsupported/unknown values.

This prevents OpenClaw or Hermes from confusing missing data with a healthy state.
