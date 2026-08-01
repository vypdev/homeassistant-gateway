# Changelog

All notable changes to this app are documented in this file.

## 0.1.4

- Added sanitized audit API and UI with decision filters.
- Added client credential rotation with one-time token display.
- Documented the current observer adapter and MCP tool contract.

## 0.1.3

- Added the Supervisor-provided Home Assistant read-only adapter.
- Added upstream readiness reporting and secret redaction.
- Added MCP inventory, states, automations and configuration tools with capability enforcement.

## 0.1.2

- Added a Lit + TypeScript + Vite management UI.
- Added overview, clients, one-time token issuance, revocation, policy and MCP discovery views.
- Added compiled static asset serving through Supervisor Ingress.

## 0.1.1

- Added an Ingress landing shell with gateway readiness feedback.
- Added the first animated dark observatory visual layer.

## 0.1.0

- Initial Home Assistant App packaging.
- Supervisor Ingress entry point.
- Public liveness and readiness endpoints.
- Observer MCP transport over Streamable HTTP.
- Bearer-authenticated MCP clients with persisted token digests.
- Capability-aware observer diagnostics.
- SQLite-backed client lifecycle and sanitized audit events.
- Operator profile disabled by default.
