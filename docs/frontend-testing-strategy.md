# Frontend Testing Strategy

The frontend acceptance suite is implemented with Playwright and is intentionally layered.

## Test layers

1. **Runtime contracts** (`pnpm run test:runtime`) validate pure frontend behavior and localization helpers.
2. **UX contracts** (`pnpm run test:ux`) validate structural presentation requirements that should remain true without a browser.
3. **Responsive acceptance** (`e2e/responsive.spec.ts`) checks all six application screens at ten explicit viewport sizes.
4. **Flow acceptance** covers clients, permission tabs, global Operator Services policy, Audit filtering, and Development Console execution evidence.
5. **Accessibility** (`e2e/accessibility.spec.ts`) runs Axe on every primary view and validates keyboard focus, tabs, form names and state.
6. **Visual regression** (`e2e/visual.spec.ts`) uses deterministic Chromium baselines for dark/light themes at phone and desktop sizes.
7. **Production-bundle smoke** runs the same browser suite against `vite preview`, not only the development server.
8. **Artifact/live verification** remains separate: passing Playwright proves the UI and HTTP contract, not Home Assistant Supervisor installation.

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
