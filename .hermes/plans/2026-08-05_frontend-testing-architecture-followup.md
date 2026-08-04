# Frontend Clean Architecture and Testing Follow-up

## Goal

Close the remaining quality improvements after the `main.ts` lifecycle/API refactor without changing the v0.5.24 user-visible contract. Preserve `GatewayApp` as the Lit composition root, keep application code independent from Lit/DOM/HTTP adapters, and keep every slice reversible.

## Current baseline

- `GatewayPort` separates application contracts from `GatewayApi`.
- `GatewayController` coordinates lifecycle operations and serialized policy persistence.
- Runtime contracts validate nested bootstrap/client/policy data.
- Bootstrap refresh supports `AbortSignal` and generation protection.
- Local frontend, backend, E2E, visual, and remote CI gates are green on the current branch.
- WebKit local execution remains blocked by missing host libraries; CI is the authoritative WebKit evidence.

## Slice order and acceptance criteria

### Slice A — Application/controller evidence

1. Keep tests for policies, autosave, controller orchestration, generation behavior, and cancellation deterministic.
2. Add explicit controller cases for mutation ordering, bootstrap failure propagation, multiple autosaves, and aborted refresh behavior.
3. Prefer a focused runtime test module or clearly separated sections; do not duplicate production logic in JavaScript.
4. Acceptance: tests prove application invariants without DOM, Lit, fetch, or browser globals.

### Slice B — GatewayApi adapter evidence

1. Test adapter request cardinality/order, paths, query encoding, JSON payloads, auth headers, 204 responses, runtime validation, and AbortSignal propagation.
2. Test normalized network/HTTP/non-JSON failures with sanitized `GatewayError` values.
3. Keep adapter tests independent from controller tests and use an injected request fake.
4. Acceptance: each adapter contract failure identifies the transport boundary.

### Slice C — Delayed-response browser evidence

1. Add deterministic Playwright scenarios for stale bootstrap, mutation followed by refresh, policy autosave responses out of order, and retry after cancellation.
2. Resolve deferred requests explicitly; never use arbitrary sleeps.
3. Assert visible state, busy/error state, request count, and final selected data.
4. Acceptance: Chromium/Firefox/Mobile Chromium pass; WebKit remains CI-only if local dependencies are absent.

### Slice D — Coverage measurement

1. Measure the existing frontend runtime gate first.
2. Do not add a global line threshold without a baseline and an explanation of generated/adapter/browser exclusions.
3. If the toolchain can measure the temporary transpiled runtime sources reliably, add a moderate threshold only for critical modules; otherwise document why coverage is not a meaningful gate yet and retain contract tests.
4. Acceptance: CI cannot silently regress the selected metric, and coverage is not presented as browser evidence.

### Slice E — Runtime contracts

1. Review readiness/status/policy/development/UI-context unions against backend models.
2. Add negative fixtures for malformed nested fields, unknown decisions/statuses, oversized arrays/strings where limits are contractual, and missing optional-vs-required fields.
3. Keep validators fail-closed without broad casts or leaking backend details.
4. Acceptance: malformed responses fail with `invalid_response` and no sensitive payload content.

### Slice F — Documentation and architecture audit

1. Update architecture/testing docs with test-layer ownership and cancellation/concurrency guarantees.
2. Reassess `main.ts` by responsibility, not line count; extract only a cohesive boundary with a testable contract.
3. Add contributor guidance for adding a new gateway operation: model → port → adapter → controller → UI → runtime/contract/E2E test.
4. Acceptance: docs match code and no stale module names remain.

### Slice G — Final verification

1. Run frontend runtime/architecture/type/build/UX/i18n gates.
2. Run focused and complete E2E projects available locally.
3. Run backend pytest/compileall/diff checks.
4. Inspect staged diff, obtain independent review for security/concurrency/public contracts, commit/push, and verify remote CI.
5. Do not publish a release unless explicitly requested; separate source, artifact, and live evidence.

## Non-goals

- No real Home Assistant mutations or live target requests.
- No release/version bump in this follow-up.
- No arbitrary `main.ts` splitting.
- No coverage threshold chosen without a measured baseline.
- No WebKit dependency installation workaround that changes the host environment silently.

## Commands

```bash
cd frontend
pnpm run test:runtime
pnpm run test:architecture
pnpm run check
pnpm run build
pnpm run test:ux
pnpm exec playwright test --project=chromium --project=firefox --project=mobile-chromium
cd ..
.venv/bin/python -m pytest -q
.venv/bin/python -m compileall -q src scripts tests
git diff --check
```
