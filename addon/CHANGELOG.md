# Changelog

All notable changes to this app are documented in this file.

## 0.5.10

- Add the read-only `ha_automation_config` MCP tool.
- Add the `automation_config` Development Console operation, selecting the first automation by default.
- Read automation configuration through Home Assistant's official configuration endpoint without filesystem access.
- Render bounded sanitized YAML and return conservative static findings for missing triggers/actions, overlap mode, duplicate entity references and malformed service references.
- Add automation configuration tests, English documentation and frontend translations.

## 0.5.9

- Add real local WebSocket contract coverage for authentication, ordering, closure, timeouts, and bounded reads.
- Enforce backend coverage at 85% with explicit unit, integration, and live-test classification.
- Add a published-container smoke harness and run it in Release App after the multi-architecture image is published and scanned.
- Add Chromium Playwright smoke coverage for Ingress rendering, keyboard navigation, reduced motion, and narrow responsive viewports.
- Extract Developer Console job orchestration from the Lit root component while preserving the public UI contract.
- Document the Home Assistant adapter façade and its port boundary.

## 0.5.8

- Bound logbook WebSocket reads to one-hour windows to avoid oversized all-day queries closing the Home Assistant connection.
- Aggregate bounded windows up to the configured result limit while preserving sanitized transport trace steps.
- Apply an explicit receive timeout to WebSocket authentication and command responses.

## 0.5.7

- Correct the native Home Assistant logbook WebSocket command to the official `logbook/get_events` contract.
- Send the official `start_time`, `end_time`, and optional `entity_ids` payload fields used by Home Assistant Core and frontend.
- Preserve WebSocket transport traces when asynchronous development jobs report `home_assistant_unavailable`.
- Keep authentication and command failures explicit; REST fallback remains limited to transport failures.

## 0.5.6

- Include `unavailable` development results in the Developer Console's “Copy errors and warnings” report.
- Keep the problem counter, button state, copied payload, and visual error classification consistent for `error`, `warning`, and `unavailable` results.
- Map `unavailable` to the localized error status label without changing the public MCP contract.

## 0.5.5

- Add the first native Home Assistant WebSocket read transport through `ws://supervisor/core/websocket`.
- Migrate registry reads, `get_config`, history, and logbook to WebSocket-first execution with explicit transport-only REST/template fallback.
- Add sanitized Developer Console trace phases for connection, authentication, commands, normalization, and fallback.
- Add detailed warning/error evidence without exposing tokens, WebSocket frames, response bodies, or sensitive parameter values.
- Keep the public MCP observer contract unchanged and preserve rollback compatibility with `0.5.4`.
- This is a verification release: validate the real Supervisor `auth_ok` handshake and live operation counts from the Developer Console before treating it as stable.

## 0.5.4

- Preserve sanitized Home Assistant upstream error code, logical path and HTTP status in MCP read results for actionable diagnostics.
- Never expose upstream response bodies or authentication material.

## 0.5.3

- Remove the browser default body margin so the UI fills the Ingress viewport without an unintended light frame.
- Add a UX contract covering the global viewport reset and horizontal overflow guard.

## 0.5.2

- Query the complete logbook when no entity filter is requested instead of probing and filtering to an arbitrary entity.
- Harden label and entity-registry template fallbacks by avoiding optional association helpers.

## 0.5.1

- Harden the read-only entity-registry fallback for Home Assistant installations where the optional `area_id()` template helper is unavailable.
- Keep core configuration failures explicit as `home_assistant_unavailable` instead of returning fabricated or silently empty configuration data.

## 0.5.0

- Complete the Clean Architecture refactor across contracts, application jobs, Home Assistant adapters, HTTP presentation, and the frontend.
- Add bounded asynchronous Development Console jobs with polling, progress, expiration, timeout, cancellation, retry, and incremental results.
- Extract frontend views and services into typed modules while preserving the observer-only management UI contract.
- Add runtime i18n and UX gates for all 233 keys across 11 locales, including empty-result handling, keyboard focus, reduced motion, and live status announcements.
- Add route-composition, frontend runtime, and frontend UX contract tests to CI.
- Complete consumer, troubleshooting, architecture, and release documentation.
- Preserve direct authenticated MCP transport on `/mcp/`, Supervisor Ingress protection for management routes, and the 18-tool observer read-only surface.
- Keep rollback compatibility with the stable `0.4.20` image.

## 0.4.20

- Extract development domain models into a dedicated application module while preserving public imports.
- Extract the frontend API client from the main Lit component.

## 0.4.19

- Guarantee terminal states for unexpected development probe and report persistence failures.
- Add bounded job expiration, executor shutdown on application shutdown and redacted error codes.
- Restore previous-report comparisons for asynchronous jobs.
- Persist and migrate `comparison_details` in SQLite development reports.
- Add polling timeout/backoff and `Location` headers for accepted jobs.
- Add consumer, troubleshooting and architecture documentation.
- Decouple MCP Bearer parsing from the main HTTP presentation module.

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
