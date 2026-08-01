# Changelog

All notable changes to this app are documented in this file.

## 0.2.1

- Fixed Home Assistant history responses, which are grouped lists rather than flat records.
- Normalize history into bounded entity groups while preserving state entries.
- Send an explicit one-day start time for history and logbook probes when no filter is supplied.

## 0.2.0

- Expanded the Ingress Development Console to 17 read-only probes.
- Added Basic Inventory, Automation Diagnostics, MCP Readiness and Data Completeness packs.
- Added persisted sanitized development reports with schema fingerprints and previous-run deltas.
- Added SQLite-backed report history and historical evidence in the UI.
- Added operator preview/diff with approval-required and execution-disabled guarantees.
- Added security response headers and an upstream endpoint matrix for registry/error behavior.

## 0.1.6

- Reported missing required Home Assistant REST resources explicitly instead of converting them to empty data.
- Kept optional entity/area registry endpoints tolerant of `404`.

## 0.1.5

- Added first-level Ingress-only Development Console.
- Added bounded probes for inventory, states, automations, configuration, services, events, history and logbook.
- Added `Run all` evidence with status, count, latency and sanitized payloads.
- Added App option `development_console_enabled`.
- Kept mutation probes approval-gated and disabled by default.

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
