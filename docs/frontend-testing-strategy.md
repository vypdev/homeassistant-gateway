# Frontend Testing Strategy

The frontend acceptance suite is implemented with Playwright and is intentionally layered.

## Test layers

1. **Runtime contracts** (`pnpm run test:runtime`) validate pure frontend behavior and localization helpers.
2. **Application/controller evidence** validates GatewayController orchestration, mutation ordering, serialized policy persistence, failure propagation and cancellation without Lit, DOM or HTTP.
3. **HTTP adapter evidence** validates GatewayApi request paths, payloads, auth headers, bootstrap request fan-out, runtime response assertions and AbortSignal propagation with an injected request fake.
4. **UX contracts** (`pnpm run test:ux`) validate structural presentation requirements that should remain true without a browser.
5. **Responsive acceptance** (`e2e/responsive.spec.ts`) checks all six application screens at ten explicit viewport sizes.
6. **Flow acceptance** covers clients, permission tabs, global Operator Services policy, Audit filtering, and Development Console execution evidence.
7. **Visual regression and Home Assistant parity** (`e2e/visual.spec.ts` and the Storybook catalog) use deterministic screenshots and manual comparison against the committed official Home Assistant references.
8. **Production-bundle smoke** runs the same browser suite against `vite preview`, not only the development server.
9. **Artifact/live verification** remains separate: passing Playwright proves the UI and HTTP contract, not Home Assistant Supervisor installation.

## Responsive invariants

Every responsive screen test verifies:

- no unexpected document-level horizontal overflow;
- no visible application element outside the viewport;
- no clipping in non-scrollable cards, panels or result rows;
- active navigation state and expected heading;
- intentional scrolling only inside the approved table/diagnostic containers.

Tables and diagnostic output are allowed to scroll horizontally or vertically inside their explicit bounded wrappers. This is part of the contract and must not become page-level overflow.

## Browser matrix

- Chromium: complete functional, responsive, accessibility and visual coverage.
- Firefox: complete current responsive/flow coverage in CI.
- WebKit: complete current responsive/flow coverage in CI; local execution requires the Playwright host dependencies.
- Mobile Chromium: responsive and flow coverage using device emulation.

Canonical visual baselines are Chromium-only to avoid requiring pixel-identical rendering across engines. Other engines must satisfy behavior, accessibility and geometry contracts.

## Fixture rules

Tests use deterministic API fixtures in `e2e/fixtures/gateway-api.ts`. Fixtures must:

- model empty, populated, disabled, error, loading and completed states;
- use complete DTO shapes required by the runtime validators, including nested readiness/health/operator fields;
- track requests so tests can assert method, path and sanitized payload;
- never contain real Home Assistant tokens, entities or private data;
- remain aligned with backend response contracts.

## Coverage boundary

The runtime gate now also exercises the real frontend HTTP wrapper for malformed successful JSON and abort propagation, validates the operator-policy save DTO, and covers serialized-save recovery after failure. The browser gate covers both stale bootstrap refreshes and overlapping client mutations; the latter asserts that the first mutation request is physically canceled before the newer mutation may apply its bootstrap. Contract tests therefore remain the authoritative evidence for pure policies, controller orchestration, adapter requests and malformed responses, while Playwright remains the evidence for browser behavior. A future coverage gate must first preserve source maps, establish a baseline, exclude generated/browser-only code explicitly, and ratchet critical modules rather than imposing an arbitrary global threshold.

## Failure evidence

CI retains the Playwright HTML report, JUnit output, traces, screenshots and videos. Snapshot updates require code review and must not be accepted merely because Playwright generated a new image.

## Required commands

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:runtime
pnpm run test:ux
pnpm run build
pnpm run test:e2e
PW_BASE_URL=http://127.0.0.1:4174 pnpm exec playwright test
```
