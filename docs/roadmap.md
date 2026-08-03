# Roadmap

This roadmap describes the current Supervisor App and its read-only MCP observer boundary. It intentionally excludes migrations and does not authorize Home Assistant mutations.

## Current release: v0.4.2

### Delivered

- [x] Supervisor-managed Home Assistant App deployment.
- [x] Supervisor Ingress-only management UI boundary.
- [x] Bounded readiness and detailed upstream health checks.
- [x] Clean Architecture boundaries for domain, application, infrastructure, presentation, and composition.
- [x] Read-only Home Assistant adapter with explicit REST operation catalog.
- [x] Complete observer inventory and registry reads exposed through the application port.
- [x] Correct Home Assistant History and Logbook REST contracts, including bounded entity probes.
- [x] Ingress-protected Development Console with individual probes and Run all.
- [x] Sanitized diagnostics with operation, status, safe reason, logical path, parameter names, latency, and request context.
- [x] Bounded transport retry for transient failures; HTTP validation errors are not retried.
- [x] Persisted sanitized diagnostic reports, fingerprints, baselines, deltas, recoveries, and regressions.
- [x] MCP observer discovery and tools using the same application read port as the UI.
- [x] Bearer-protected MCP transport and explicit observer capabilities.
- [x] Eleven-language UI catalog with locale normalization and safe fallback.
- [x] Home Assistant-aware light/dark/auto theme resolution with local override.
- [x] Keyboard/focus accessibility, reduced motion, high contrast, and semantic busy state.
- [x] Operational topology view without secrets or credential-bearing endpoints.
- [x] Operator preview validation and diff contract; real mutations remain disabled.
- [x] Multi-architecture releases for amd64, arm64, and armv7.
- [x] CI, Release App, documentation, changelog, and artifact verification.

## Next quality slices

### 1. Roadmap and contract maintenance

- [ ] Keep this roadmap synchronized with every release.
- [ ] Add a generated/public contract inventory for HTTP and MCP operations.
- [ ] Add documentation link and secret scans to the release gate.

### 2. Reproducible Home Assistant integration verification

- [ ] Add a disposable or explicitly configured Home Assistant integration harness.
- [ ] Exercise Supervisor/Core, states, Recorder, History, Logbook, and MCP boundaries.
- [ ] Cover HTTP 400/401/403/404/5xx, timeout, connection reset, invalid JSON, schema mismatch, empty data, and optional-resource states.
- [ ] Keep live-instance verification separate from unit, contract, CI, and published-artifact evidence.

### 3. Observability and diagnostics

- [ ] Preserve a typed failure taxonomy for timeout, refused/reset connection, DNS, HTTP, invalid JSON, schema, and dependency failures.
- [ ] Return bounded `X-Request-ID` values consistently, including rejected requests.
- [ ] Add structured latency and payload-size fields to all diagnostic results.
- [ ] Add explicit export/download of sanitized reports.
- [ ] Add cancellation and progress reporting for long Run all executions.

### 4. Scale and performance

- [ ] Implement bounded upstream pagination where the Home Assistant contract exposes pages.
- [ ] Add explicit start/end windows to History and Logbook probes.
- [ ] Reuse a bounded states snapshot during one Run all execution.
- [ ] Add response-size, entity-count, and accumulated-latency limits.
- [ ] Add regression tests for large inventories and slow Recorder queries.

### 5. Baselines and operational analysis

- [ ] Add explicit baseline creation and replacement controls for read-only reports.
- [ ] Improve disappearance, schema, capability, and availability regression messages.
- [ ] Add visual and JSON comparison export.
- [ ] Add optional local alert integration without exposing payloads or secrets.

### 6. MCP client documentation and verification

- [ ] Document verified observer configuration for Hermes.
- [ ] Document verified observer configuration for OpenClaw.
- [ ] Add examples that show effective allowlist/capability verification.
- [ ] Add repeated-call and concurrent-session protocol tests.
- [ ] Document that model prompts do not grant permissions.

### 7. Security and release assurance

- [ ] Add dependency and container vulnerability checks.
- [ ] Generate or verify an SBOM without including secrets.
- [ ] Verify image contents, runtime permissions, exposed ports, and absence of Docker socket/SSH/shell access.
- [ ] Add negative tests for Ingress bypass, MCP authorization bypass, sensitive fields, oversized payloads, and operator activation.
- [ ] Verify release notes, tag, image digest, and all supported architectures independently.

## Operator boundary

The disabled operator safety framework is documented in [`operator-profile.md`](operator-profile.md). It provides bounded approval, replay protection, emergency control, validation and typed mutation boundaries without registering a write adapter.

Operator functionality remains preview-only. Enabling real mutations is a separate future decision and requires, at minimum:

- explicit capability allowlists;
- typed schemas and target validation;
- dry-run and structured diff;
- explicit approval;
- idempotency key;
- before/after audit;
- bounded execution;
- rollback strategy;
- emergency disable;
- complete unit, contract, and live verification.

## Non-goals

- Arbitrary shell or Python execution.
- Docker socket access.
- SSH access.
- Transparent proxying of the entire Home Assistant API.
- Reading `/config`, `secrets.yaml`, `.storage`, cookies, or credential-bearing files.
- Storing client or Home Assistant secrets in OpenClaw or Hermes.
- Migration work for legacy releases.
- Enabling operator permissions by default.
