# Home Assistant Gateway — architecture and testing hardening

Date: 2026-08-03
Repository: `vypdev/homeassistant-gateway`
Baseline: `0.5.8`, live Home Assistant/Supervisor verification completed

## Goal

Improve execution isolation, transport contracts, testing evidence, and maintainability without changing the public MCP/HTTP contract or enabling mutations.

## Quality rules

- Clean Architecture boundaries remain explicit: presentation → application → domain; infrastructure implements application ports; composition wires concrete adapters.
- No secrets, full upstream bodies, cookies, tokens, query values, or raw WebSocket frames in traces, fixtures, logs, or reports.
- Every external call remains bounded and errors remain typed/sanitized.
- Each slice is reversible and closes with focused tests, full tests, lint, compile/type/build checks, documentation, and diff review.
- Contract, artifact, and live evidence remain separate.
- No release until the final artifact and relevant live smoke are verified.

## Phases

### 1. Execution isolation (highest priority)

- Replace mutable `last_trace` side channels with an immutable per-execution result/context.
- Preserve the public data/MCP result shape; keep trace additive.
- Make concurrent Developer Console jobs unable to overwrite each other's trace.
- Add deterministic two-job interleaving regression tests.
- Preserve sanitized details for transport and fallback failures.

Acceptance:

- No application execution path depends on shared mutable trace state.
- Concurrent tests prove trace ownership.
- Full backend suite and Ruff pass.

Rollback: retain a compatibility facade only if an import contract requires it; do not reintroduce shared execution state.

### 2. WebSocket integration contract

- Add a local real WebSocket server/connector contract around `websockets`.
- Test `auth_required → auth_ok`, auth rejection, command errors, out-of-order messages, closure, receive timeout, invalid JSON, binary frames, and max message size.
- Keep mutating command rejection covered before send.
- Keep Supervisor proxy URL/auth behavior separate from direct Core behavior.

Acceptance:

- Unit fake transport and real local protocol tests both pass.
- No test contacts a live network unless explicitly marked `live`.

### 3. Logbook bounded-read contract

- Test one-hour window partitioning, partial windows, empty windows, aggregation, maximum item limit, chronological ordering, duplicate boundaries, mid-window closure, and explicit REST fallback.
- Document result ordering and truncation semantics.
- Keep `logbook/get_events` payload aligned with Home Assistant Core/frontend.

Acceptance:

- No unbounded all-day request is emitted.
- A transport failure remains visible and fallback is traceable.

### 4. Coverage and test taxonomy

- Add `pytest-cov` to the test extra.
- Add a gradual coverage report/threshold, starting from measured baseline rather than an invented target.
- Classify tests as unit, contract, integration, and live.
- Keep live tests skip-safe without claiming live evidence.
- Add missing error-path tests before raising the threshold.

Acceptance:

- CI reports coverage and fails only on a documented, achievable threshold.
- The threshold is increased after each material slice.

### 5. Artifact parity

- Add a bounded container smoke that checks packaged imports, `/ready`, and static asset availability.
- Verify source, wheel/package, Docker context, image, manifest, and release tag independently.
- Keep multi-architecture verification for amd64/arm64/armv7.

Acceptance:

- The published artifact contains the same runtime modules tested from source.
- No Docker socket, arbitrary shell, or new secret is introduced.

### 6. Frontend partitioning

- Extract state/controller/service wiring from `main.ts`.
- Keep `main.ts` as composition/bootstrap façade.
- Extract Developer Console trace panel and report actions.
- Preserve Lit context, i18n fallback, accessibility, responsive behavior, and clipboard fallback.
- Add runtime helper and type/build checks per slice.

Acceptance:

- No duplicated API calls or state owners.
- Existing public UI behavior and translations remain unchanged.

### 7. Browser smoke E2E

- Add a minimal Playwright/browser smoke suite for real rendering.
- Cover Ingress load, navigation, keyboard focus, trace expansion, copy report, narrow viewport, reduced motion, and clipboard-unavailable fallback.
- Keep it separate from helper/runtime tests.

Acceptance:

- CI can run deterministic browser smoke without Home Assistant credentials.
- Live Ingress smoke remains an optional separately reported check.

### 8. Adapter composition review

- Evaluate replacing the concrete multiple-inheritance façade with composed reader/transport adapters.
- Keep ports in application and vendor details in infrastructure.
- Migrate only if dependency direction and testability improve; do not refactor for aesthetics alone.

Acceptance:

- No public contract changes.
- Focused adapter contract tests pass before and after migration.

### 9. Final quality/release gate

Run:

```bash
PYTHONPATH=. .venv/bin/pytest -q
.venv/bin/ruff check src tests scripts
.venv/bin/python -m compileall -q src tests scripts
.venv/bin/python scripts/check_frontend_i18n.py
.venv/bin/python scripts/check_frontend_i18n_runtime.py
npm --prefix frontend run test:runtime
npm --prefix frontend run test:ux
npm --prefix frontend run check
npm --prefix frontend run build
git diff --check
```

Then verify CI, Release App, Trivy, tag, GitHub Release, image manifest, and live smoke separately. Publish only after all required evidence is present.

## Current baseline evidence

- `0.5.8` live-verified: labels and logbook work through Supervisor/Core WebSocket.
- Backend no-live suite passes with coverage enforced at `86.27%` and a CI floor of `85%`.
- Frontend runtime/UX/type/build/i18n gates pass.
- Real local WebSocket protocol tests pass.
- Playwright Chromium smoke passes `3/3` against a mocked Ingress API boundary.
- CI and Release App pass with Node 24 actions.
- Published-image smoke harness is implemented but Docker execution is blocked on this host by Docker socket permissions.
- The frontend Developer Console polling orchestration now lives in `frontend/src/development-controller.ts`.
- Adapter review retained the current mixin façade intentionally; no public contract or dependency-direction defect justified a mechanical delegation rewrite.
- Live Supervisor artifact verification and release remain open until the final versioned artifact is built and independently checked.
