# Changelog

All notable changes to this app are documented in this file.

## 0.4.18

- Run Development Console probes as bounded background jobs instead of blocking one HTTP request until every probe finishes.
- Expose queued/running/completed job state with incremental results and progress counters.
- Surface empty collection results as explicit warnings instead of silently treating them as successful empty data.
- Add a read-only template fallback for Home Assistant registries when the corresponding REST registry routes are unavailable.
- Keep the Development Console documentation focused on the operator/consumer-visible execution contract.

## 0.4.17

- Normalize host-only MCP allowlist entries to accept the actual `Host: hostname:port` header.
- Add an explicit Gateway bootstrap state with a calm neural loading background, clear failure state, and retry action.
- Keep the animated network background present behind the loaded console.

## 0.4.16

- Expose the explicit MCP Host allowlist as a Supervisor App option for direct LAN clients.
- Preserve DNS rebinding protection instead of disabling Host validation.

## 0.4.15

- Resolve Development Console translations directly from the merged locale catalogs at runtime.
- Refine the console layout with calmer contrast, softer secondary buttons, consistent spacing, and visible keyboard focus.

## 0.4.14

- Allow direct authenticated MCP transport on `/mcp/` without Supervisor Ingress identity headers.
- Keep the management UI and administrative APIs protected by Supervisor Ingress identity.
- Add an end-to-end regression proving direct MCP requests use Bearer observer authentication.

## 0.4.13

- Complete the Development Console localization across all 11 supported locales.
- Localize probe and pack labels/descriptions, statuses, filters, errors, historical evidence, and dynamic health/topology states.
- Remove remaining hardcoded user-facing labels from Overview, Clients, Policy, MCP, Audit, and accessibility attributes.
- Extend the i18n gate to cover the new modular catalogs and verify 233 keys in every locale.

## 0.4.12

- Correct the Supervisor port mapping order to `container-port/tcp: host-port`.
- Publish container port `8099/tcp` on Home Assistant host port `18099`.
- Keep the management UI on Ingress and the direct MCP transport observer-only.

## 0.4.11

- Add bounded Development Console checks for the local Gateway listener and MCP authentication boundary.
- Explicitly report that Supervisor host-port publication and LAN firewall reachability require an external check.
- Keep diagnostics shell-free, observer-only, credential-free, and limited to the Gateway's own local endpoints.
- Localize the new port/MCP diagnostic operation in all 11 supported locales.
- Add focused success, failure, sanitization, API catalog, and run-all regression coverage.

## 0.4.10

- Publish the observer MCP transport on host port `18099/tcp` mapped to the internal add-on port `8099`.
- Avoid reusing the internal Ingress port as the external host port.
- Update Hermes integration documentation to use `http://<home-assistant-host>:18099/mcp/`.

## 0.4.9

- Publish host port `8099/tcp` for native MCP clients such as Hermes.
- Keep the management UI behind Supervisor Ingress.
- Document the direct authenticated observer endpoint at `/mcp/`.
- Keep operator mutations disabled and do not register write tools.

## 0.4.8

- Add an understandable grouped capabilities selector with observer preset and blocked operator capabilities.
- Complete frontend localization coverage for English, Spanish, French, German, Portuguese, Italian, Chinese, Japanese, Russian, Hindi, and Arabic.
- Add CI validation that every supported locale contains the complete translation key set.
- Localize client management, audit, policy, MCP discovery, diagnostics, token, and empty-state UI content.
- Keep operator mutations preview-only, approval-gated, and disabled; no write tools are registered in this release.
- Verify frontend type-check/build, 80 backend tests, i18n coverage, and repository formatting.

## 0.4.7

- Add a bounded live smoke harness for Supervisor Ingress, API, readiness, and optional MCP checks.
- Add live smoke documentation with explicit contract, artifact, and live evidence levels.
- Scan the published multi-architecture image for HIGH and CRITICAL vulnerabilities in Release App.
- Run the live smoke harness in CI in explicit skip mode when no live target is configured.

## 0.4.6

- Reject invalid or unbounded Supervisor adapter `max_items` values.
- Add regression coverage for bounded response configuration.

## 0.4.5

- Synchronize OpenClaw and Hermes documentation with the 18 registered observer tools.
- Explicitly document that operator tools are not registered and preview never executes mutations.
- Add a CI Python dependency vulnerability audit using `pip-audit`.

## 0.4.4

- Align Recorder and Logbook health checks with the corrected current Home Assistant REST routes.
- Use one bounded real entity for health checks instead of legacy `start_time` query parameters.
- Add contract coverage proving health and direct probes use the same routes.

## 0.4.3

- Classify transport failures as timeout, connection, network, or unavailable.
- Preserve logical diagnostic paths and bounded parameter names for transport errors.
- Add regression coverage proving timestamp and entity values remain absent from diagnostics.

## 0.4.2

- Use Home Assistant REST timestamp path segments for history and logbook.
- Send `filter_entity_id` and `entity` using the documented query parameters.
- Use a bounded real entity as the automatic read-only probe when Run all has no entity filter.
- Keep dynamic timestamps out of sanitized diagnostic paths.

## 0.4.1

- Normalize default history and logbook boundaries to Home Assistant's documented UTC `Z` format.
- Retry one transient transport failure while keeping HTTP errors non-retriable.
- Add adapter regressions for timestamp formatting and retry semantics.

## 0.4.0

- Added detailed upstream health checks for Core, states, services, events, Recorder/history and Logbook.
- Added retryable diagnostics, browser-local sanitized JSON export and report regression details.
- Added 11 locale catalogs with Home Assistant fallback and local language override.
- Added upstream health visualization and stronger operator-preview validation.
- Expanded MCP discovery and read-only tools to cover the complete observer catalog.
- Added high-contrast and busy-state accessibility behavior for the console.
- Documented the current Development Console contracts and security boundary.

## 0.3.0

- Added sanitized upstream diagnostics with endpoint, status and parameter names for development probe failures.
- Added a copyable diagnostic action for failed probes without copying secrets or payloads.
- Added locale fallback resolution for English, Spanish and French.
- Added Home Assistant UI context endpoint for locale/theme hints, with browser fallback.
- Added light/dark/auto visual modes aligned with Home Assistant/browser preferences.
- Added an accessible animated neural-network background with reduced-motion support.

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
