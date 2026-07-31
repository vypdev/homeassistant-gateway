# ADR 0001: Home Assistant-native integration first

- Status: accepted
- Date: 2026-07-31

## Context

The existing Home Assistant MCP exposes useful read-only state and entity data, but a complete analysis requires configuration metadata, automations, scripts, services, diagnostics, and controlled access to the Home Assistant runtime. Credentials and higher-risk operations must remain inside the Home Assistant trust boundary.

## Decision

Build `homeassistant-gateway` first as a Supervisor-managed Home Assistant App installed from the GitHub repository. The App starts with Home Assistant, exposes its management UI through Ingress, owns the MCP transport, and uses authenticated Home Assistant/Supervisor boundaries. Add a companion custom integration only when native entities/services or a native sidebar panel provide clear value.

Use two explicit security profiles:

- observer: read-only by default;
- operator: separately provisioned and disabled until the approval/policy/audit model is complete.

## Consequences

Positive:

- credentials remain inside Home Assistant;
- configuration and automation reads use the local authoritative runtime;
- the UI can make capability boundaries visible;
- OpenClaw and Hermes consume stable client identities rather than admin secrets.

Trade-offs:

- deployment follows Home Assistant custom-integration lifecycle constraints;
- MCP transport may require an add-on adapter if process embedding is unsuitable;
- the project needs strong compatibility testing across Home Assistant releases.

## Rejected alternatives

### External privileged proxy first

Rejected because it expands the credential and network boundary before the policy model exists.

### Full Home Assistant API passthrough

Rejected because it makes the MCP contract unstable and exposes capabilities that cannot be safely reasoned about or audited.
