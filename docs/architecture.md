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

## Home Assistant deployment shape

### Phase 1: custom integration

A custom integration runs in the Home Assistant process and provides:

- config flow for initial setup;
- options flow for policy and client management;
- a sidebar panel for connection status, profiles, capabilities, audit events, and safe diagnostics;
- an internal service boundary for reading state/configuration and invoking approved services;
- an MCP transport adapter bound to the configured local/protected boundary.

The integration must not start a publicly reachable unauthenticated listener by default.

### Phase 2: optional add-on transport

If the Home Assistant process cannot host a suitable MCP transport, an add-on may run a separate process on the same host. It must communicate through a narrow authenticated local API or supervisor boundary, not Docker socket access. The add-on remains an infrastructure adapter; policy and domain behavior stay shared.

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
