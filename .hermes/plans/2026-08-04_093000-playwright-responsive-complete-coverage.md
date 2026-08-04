# Playwright Responsive and Complete UI Coverage Plan

> **For Hermes:** Execute this plan task-by-task with the quality-first and test-driven-development workflows. Use pnpm exclusively for all frontend commands.

**Goal:** Build a strict, maintainable Playwright quality system that detects responsive, visibility, accessibility, interaction, state, localization, theme, and visual-regression defects before a Home Assistant Gateway artifact is installed.

**Architecture:** Keep Playwright as an external acceptance-test adapter. It must exercise the built application through the same HTTP/API boundary used by Ingress, while deterministic API fixtures provide controlled upstream states. Keep page objects, fixtures, mock data builders, assertions, and visual policies in separate modules; do not put application logic or selectors into the test runner itself. Use layered evidence: deterministic functional E2E, accessibility checks, geometry/overflow assertions, screenshot snapshots, and optional live/installed smoke tests.

**Tech Stack:** Playwright Test, TypeScript, pnpm 11.15.1, Vite production preview, Chromium/Firefox/WebKit, mobile emulation, screenshot snapshots, optional `@axe-core/playwright`, GitHub Actions matrix/sharding.

---

## 1. Define the coverage contract and non-negotiable invariants

**Objective:** Establish exactly what “complete” means and prevent tests from becoming a collection of ad-hoc screenshots.

**Files:**
- Create: `docs/frontend-testing-strategy.md`
- Create: `frontend/e2e/contracts/visual-contract.ts`
- Modify: `AGENTS.md`
- Modify: `README.md`

**Required invariants at every tested screen:**

- The page has no unexpected horizontal document overflow: `document.documentElement.scrollWidth <= window.innerWidth`.
- No visible element in the application content is clipped outside the viewport unless it is an explicitly approved scroll container such as a table or bounded diagnostic output.
- The active navigation item is visible and has an accessible active state.
- The visible page has exactly one meaningful primary heading where the design expects one.
- Every visible interactive control is enabled/disabled according to the current server/profile state.
- Every visible interactive control has an accessible name, is keyboard reachable, and has a visible focus state.
- No visible text has zero bounding-box width/height, is clipped, or overflows its owning card unexpectedly.
- No uncaught page error or unexpected console error occurs.
- The page remains usable at the tested locale, theme, font scale, and reduced-motion setting.
- Expected scroll containers are declared by selector and reason; all other overflow is a failure.

**Important boundary:** “All scenarios” means all product flows and meaningful state partitions, not every mathematical combination of every viewport, locale, theme, and backend response. Use a full invariant suite on every page/viewport and a pairwise matrix for the expensive combinations.

**Verification:** Review the strategy document and make each invariant executable by a reusable assertion helper before adding broad test cases.

---

## 2. Build deterministic API fixture builders

**Objective:** Replace the current single minimal route payload with typed, reusable application states that can exercise every UI branch without duplicating route logic in every test.

**Files:**
- Create: `frontend/e2e/fixtures/gateway-state.ts`
- Create: `frontend/e2e/fixtures/gateway-api.ts`
- Create: `frontend/e2e/fixtures/builders.ts`
- Modify: `frontend/e2e/gateway.spec.ts`
- Test: `frontend/e2e/fixtures/*.spec.ts` only if pure builders need direct tests

**Fixture states to support:**

- `readyEmpty`: gateway ready, no clients, no audit, empty development catalog.
- `readyPopulated`: multiple clients, observer/operator profiles, active/revoked clients, audit records, service policy, health checks, topology data.
- `operatorDisabled`: operator globally disabled and write capabilities unavailable.
- `operatorEnabled`: operator enabled but execution still disabled and mutation tools absent.
- `globalServicesEmpty`: no globally enabled Operator services; client view must show the translated policy link.
- `globalServicesPopulated`: multiple domains, service groups, selected services, granted-client counts.
- `clientCreateValidation`: API validation failures for empty/invalid/duplicate display names.
- `clientIssued`: one-time token issuance response and post-creation state.
- `clientActionFailure`: revoke/rotate failure with sanitized error UI.
- `developmentCatalog`: operations and packs with long descriptions and mixed supported/blocked probes.
- `developmentResults`: successful, warning, unavailable, error, empty-result, traceable and blocked results.
- `loadFailure`: `/ready`, `/api/health/details`, discovery, or view-specific API failure.
- `slowJob`: queued/running/progress/completed development job snapshots.
- `longContent`: long names, long capability descriptions, long service names, long trace paths, Unicode and RTL text.

Use a typed state builder and one request handler that maps API paths to the selected state. Every mutation endpoint must record requests so tests can assert the exact method, path, payload, and that disabled controls never submit forbidden operations.

**Verification:** Each state can boot the app without console errors and each fixture has at least one test that reaches the branch it exists to cover.

---

## 3. Create the Playwright test architecture

**Objective:** Keep tests readable and prevent a giant `gateway.spec.ts` from becoming unmaintainable.

**Files:**
- Create: `frontend/e2e/fixtures/test.ts`
- Create: `frontend/e2e/pages/gateway-page.ts`
- Create: `frontend/e2e/pages/clients-page.ts`
- Create: `frontend/e2e/pages/policy-page.ts`
- Create: `frontend/e2e/pages/development-page.ts`
- Create: `frontend/e2e/pages/audit-page.ts`
- Create: `frontend/e2e/pages/mcp-page.ts`
- Create: `frontend/e2e/assertions/layout-assertions.ts`
- Create: `frontend/e2e/assertions/accessibility-assertions.ts`
- Create: `frontend/e2e/assertions/interaction-assertions.ts`
- Create: `frontend/e2e/support/console-errors.ts`
- Modify: `frontend/playwright.config.ts`
- Refactor: `frontend/e2e/gateway.spec.ts` into focused specs

**Rules:**

- Page objects expose user-level actions and semantic locators, not implementation details.
- Fixtures own API state and request assertions.
- Layout assertions accept an allowlist of intentional scroll containers.
- No test should use arbitrary sleeps; wait for visible state, network response, or a specific progress transition.
- Prefer role/name/test-id selectors. Add stable `data-testid` only where a semantic locator is not appropriate; document each test ID.
- Keep test names tied to user-observable behavior.
- Use `test.step` around flows so CI traces identify the exact failed transition.
- Capture a screenshot and trace on every failure; capture console/page errors in the report.

---

## 4. Establish the viewport and browser matrix

**Objective:** Detect real responsive failures while keeping runtime and snapshot maintenance bounded.

### Required viewport profiles

- `320x568`: smallest supported narrow portrait.
- `360x800`: compact Android portrait.
- `390x844`: current iPhone-class portrait baseline.
- `414x896`: large phone portrait.
- `568x320`: compact landscape.
- `768x1024`: tablet portrait.
- `1024x768`: tablet landscape / breakpoint boundary.
- `1280x800`: laptop baseline.
- `1440x900`: desktop baseline.
- `1920x1080`: wide desktop.

### Browser profiles

- Chromium desktop: complete functional and visual matrix.
- Mobile Chromium emulation: complete narrow responsive matrix.
- Firefox desktop: navigation, forms, overflow, keyboard, visual smoke.
- WebKit desktop/mobile: navigation, forms, overflow, keyboard, visual smoke.

### Execution strategy

- Run strict geometry/invariant assertions on every viewport in every supported browser project.
- Run complete flows on the canonical viewports `390x844`, `1024x768`, and `1440x900` across Chromium, Firefox, and WebKit.
- Run screenshot snapshots on canonical viewports for dark/light themes and English/Spanish; add French for the consumer-facing smoke set.
- Run the full locale text-expansion smoke on all 11 locales at `390x844` and `1440x900`, with geometry assertions but without duplicating every screenshot.
- Run boundary-focused tests at `320`, `360`, `768`, `1024`, and `1100` widths to catch media-query transitions.

This produces strict coverage without creating thousands of redundant screenshots.

**Files:**
- Modify: `frontend/playwright.config.ts`
- Create: `frontend/e2e/viewports.ts`
- Create: `frontend/e2e/projects.ts` if project generation is useful

---

## 5. Add reusable geometry, visibility and overflow assertions

**Objective:** Fail before installation when content is present but unusable or visually clipped.

**Files:**
- Create: `frontend/e2e/assertions/layout-assertions.ts`
- Create: `frontend/e2e/assertions/text-assertions.ts`
- Modify: `frontend/scripts/test-ux-contracts.mjs`

**Assertions to implement:**

- `expectNoUnexpectedHorizontalOverflow(page)`.
- `expectNoVisibleElementOutsideViewport(page, options)`.
- `expectNoClippedVisibleText(page, selectors)` using `scrollWidth/clientWidth` and `scrollHeight/clientHeight` where clipping is not intentional.
- `expectCardsWithinContainer(page, selector)`.
- `expectResponsiveGrid(page, selector, expectedColumns)` at known breakpoints.
- `expectStickyNavigationUsable(page)`.
- `expectVisibleAndStable(locator)` after navigation and after state changes.
- `expectNoUnexpectedFixedOverlay(page)` to catch dialogs/backdrops left open.
- `expectInteractiveControlsReachable(page)` using keyboard traversal and focus visibility.
- `expectApprovedScrollContainersOnly(page, allowlist)`.

Do not flag intentional table/diagnostic scrolling. The allowlist must be explicit and tested for correct containment.

---

## 6. Cover the application shell and navigation flows

**Objective:** Verify the shell before testing individual pages.

**Files:**
- Create: `frontend/e2e/shell.spec.ts`
- Create: `frontend/e2e/navigation.spec.ts`
- Modify: `frontend/e2e/pages/gateway-page.ts`

**Flows:**

- Boot/loading screen shows only the intended checking state.
- Ready state renders the shell and navigation.
- Ready failure renders the error/retry state; retry re-requests readiness.
- Every navigation item reaches the correct heading and active state.
- Browser refresh preserves a valid route/state without blank content.
- Keyboard Tab order reaches navigation, controls and main content in a logical order.
- Enter/Space activates buttons; focus remains visible.
- Escape closes modal/dialog surfaces where applicable.
- Back/forward navigation does not leave stale active navigation or duplicate requests.
- Theme `dark`, `light`, and `auto` are rendered without unreadable text.
- `prefers-reduced-motion: reduce` disables ambient and boot animations.
- Locale override changes visible page text and survives reload according to the intended contract.
- No page or console errors after each transition.

---

## 7. Cover Overview, Health and Topology

**Objective:** Exercise desktop/tablet/mobile layout branches and data-dependent status rendering.

**Files:**
- Create: `frontend/e2e/overview.spec.ts`
- Create: `frontend/e2e/health.spec.ts`
- Create: `frontend/e2e/topology.spec.ts`

**Scenarios:**

- Empty/unknown/ready/warning/error health checks.
- Metric cards at 4/2/1 column breakpoints.
- Topology at 5/2/1 columns and narrow card content.
- Long health check names and sanitized details.
- Status colors and text for `ok`, `warning`, `unavailable`, `error`, and unknown states.
- Refresh action and loading state.
- Empty collections do not collapse headings or create misleading blank cards.
- Intentional table/diagnostic scrolling remains contained.

---

## 8. Cover Clients and token lifecycle flows

**Objective:** Validate every client form branch, profile/capability rule, and token action.

**Files:**
- Create: `frontend/e2e/clients.spec.ts`
- Modify: `frontend/e2e/fixtures/gateway-state.ts`

**Scenarios:**

- Empty client state and issue observer client flow.
- Valid display name submission and one-time token visibility.
- Empty, whitespace, too-long, Unicode and duplicate display names.
- API validation/error response and recovery.
- Observer profile: every `ha.write.*` control is disabled, visibly marked, and cannot be submitted.
- Operator profile while global operator is disabled: operator option and writes remain unavailable.
- Operator profile while global operator is enabled: globally enabled Operator services can be selected.
- Switching operator → observer removes/blocks write selections and does not submit them.
- Switching observer → operator does not silently grant previously removed writes.
- Capabilities and Operator Services tabs have correct `aria-selected`, panel association, keyboard behavior and content.
- No globally enabled services: translated explanatory state and working link to global policy.
- Service groups, long descriptions and active-client counts remain readable.
- Revoke flow: confirmation, success, failure and stale-row recovery.
- Rotate flow: confirmation, one-time token, old token invalidation messaging and failure recovery.
- Rapid duplicate submits are blocked/debounced and generate at most one request.
- Token is never rendered in list/table or leaked to console/URL.

---

## 9. Cover global Policy flows

**Objective:** Verify policy editing, summaries, service grouping and disabled execution semantics.

**Files:**
- Create: `frontend/e2e/policy.spec.ts`

**Scenarios:**

- Policy loading, empty policy, populated policy and unavailable policy.
- Summary counts match selected services and active operator clients.
- Grouped services are visually separated and remain usable at all viewports.
- Select/unselect service, dirty state, save enabled/disabled state.
- Save success updates summary and clears dirty state.
- Save failure preserves selections, shows sanitized error and permits retry.
- Global policy does not itself activate client grants; verify explanatory copy.
- Long service names/descriptions and large service counts.
- Keyboard navigation through every service checkbox.
- Light/dark contrast and focus states.
- No accidental write/mutation call is performed by policy UI because execution remains disabled.

---

## 10. Cover MCP, Audit and Development Console flows

**Objective:** Exercise all remaining screens and their result/error branches.

**Files:**
- Create: `frontend/e2e/mcp.spec.ts`
- Create: `frontend/e2e/audit.spec.ts`
- Create: `frontend/e2e/development.spec.ts`

**MCP scenarios:**

- Discovery loading, populated discovery and unavailable discovery.
- Tool/resource counts, long tool names, safe empty states.
- Observer-only mutation filtering and disabled execution messaging.

**Audit scenarios:**

- Empty audit, populated audit, sanitized fields, long request IDs/paths.
- Filter by all/allowed/denied/approval-required.
- Filter failure and recovery.
- Table containment and horizontal scroll only inside the approved wrapper.

**Development Console scenarios:**

- Catalog loading, empty catalog and catalog error.
- Run one operation, run one pack, run all.
- Queued/running/progress/completed states.
- `ok`, `warning`, `unavailable`, `error`, `empty_result`, `blocked` results.
- Trace expansion/collapse and sanitized trace content.
- Copy one diagnostic, copy problems, export full diagnostic.
- Clipboard available, clipboard unavailable/fallback, and failure feedback.
- Retry failed probe and verify request count.
- Entity/time filters with valid, empty, invalid and long values.
- Rapid repeated run protection.
- Long JSON payloads, bounded output scrolling and no page-level overflow.

---

## 11. Add accessibility and interaction testing

**Objective:** Catch issues that screenshot comparison cannot detect.

**Files:**
- Add dependency: `frontend/package.json` (`@axe-core/playwright`) if approved by dependency policy.
- Modify: `frontend/pnpm-lock.yaml`
- Create: `frontend/e2e/accessibility.spec.ts`
- Create: `frontend/e2e/assertions/accessibility-assertions.ts`
- Modify: `.github/workflows/ci.yml`

**Checks:**

- Axe scan after boot and on every major view/state in canonical themes/locales.
- No missing accessible names for buttons, links, inputs, selects, tabs, dialogs and status regions.
- Correct tab/tabpanel relationships.
- Heading hierarchy and landmark structure.
- Keyboard-only traversal through every flow.
- Focus visible in dark and light themes.
- Focus is not trapped behind overlays; dialogs have correct semantics.
- Disabled controls are not keyboard actionable.
- Status/error/progress messages use appropriate live-region behavior without excessive announcements.
- Color is never the sole indicator of status.
- Minimum touch target size for mobile controls, with documented exceptions.
- RTL smoke for Arabic where layout direction is supported; otherwise explicitly document the current contract and expected limitation.

Run accessibility checks separately from visual snapshots so failures identify the actual contract.

---

## 12. Add visual regression snapshots with controlled baselines

**Objective:** Detect unexpected visual changes while avoiding brittle snapshots caused by animations, timestamps or backend noise.

**Files:**
- Create: `frontend/e2e/visual.spec.ts`
- Create: `frontend/e2e/visual-baselines/` generated by Playwright
- Create: `frontend/e2e/support/visual.ts`
- Modify: `frontend/playwright.config.ts`
- Document: `docs/frontend-testing-strategy.md`

**Snapshot policy:**

- Freeze time and use deterministic fixture data.
- Disable animations/transitions during screenshots through a test-only style injection.
- Mask dynamic token values, timestamps, generated IDs and progress indicators.
- Capture full-page and viewport screenshots only where appropriate; prefer stable component/page regions for long scrollable screens.
- Baselines: Chromium first at `390x844`, `1024x768`, `1440x900`; dark/light; English/Spanish. Add Firefox/WebKit smoke snapshots after Chromium stabilizes.
- Use strict thresholds and review every baseline change as a code review artifact; never update snapshots blindly.
- Include screenshots for: shell, overview, clients empty/populated, clients capabilities tab, operator-services tab, policy summary/list, MCP, audit, development results, error state, loading state, modal/token state.

Visual tests must be paired with geometry assertions; a screenshot can look plausible while containing an inaccessible or clipped element.

---

## 13. Test production artifacts before installation

**Objective:** Ensure tests exercise what users will install, not only the Vite dev server.

**Files:**
- Modify: `frontend/playwright.config.ts`
- Create: `frontend/scripts/serve-built.mjs` only if Vite preview is insufficient
- Modify: `.github/workflows/ci.yml`
- Modify: `addon/Dockerfile`
- Modify: `scripts/artifact_smoke.py` if available

**Sequence:**

1. `pnpm install --frozen-lockfile`.
2. `pnpm run check`.
3. `pnpm run test:runtime` and `pnpm run test:ux`.
4. `pnpm run build`.
5. Start `pnpm exec vite preview --host 127.0.0.1 --port <port>` against `frontend/dist`.
6. Run the complete Playwright smoke and visual suite against the production build.
7. Build the add-on/container artifact in CI.
8. Run artifact smoke for `/health`, `/ready`, static asset serving, and Ingress shell loading where Docker is available.
9. Keep “source/dev server passed”, “production bundle passed”, “container artifact passed”, and “live installed add-on passed” as separate evidence labels.

The release workflow must block publication if the production bundle E2E suite fails.

---

## 14. Scale CI without losing strictness

**Objective:** Keep the suite fast enough to run on every PR while retaining a nightly exhaustive matrix.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/frontend-visual-nightly.yml`
- Modify: `frontend/playwright.config.ts`

**Pull request gates:**

- Chromium canonical functional suite.
- Chromium responsive boundary suite.
- Axe/accessibility suite.
- Production-build smoke.
- Deterministic visual snapshots.
- Package-manager guard.

**Nightly/release gates:**

- Chromium all viewport profiles.
- Firefox and WebKit functional suite.
- All 11 locale geometry suite.
- Dark/light/auto theme suite.
- Reduced-motion suite.
- Long-content and error-state suite.
- Visual snapshots across the approved browser/profile matrix.
- Sharded Playwright execution with merged HTML, trace, screenshot and JUnit reports.

Use retries only for infrastructure flakes, never to hide deterministic assertion failures. Quarantine a test only with an issue, owner, reason and expiry date.

---

## 15. Add debugging and reporting evidence

**Objective:** Make a failed UI test actionable without reproducing it manually.

**Files:**
- Modify: `frontend/playwright.config.ts`
- Create: `frontend/e2e/support/reporting.ts`
- Modify: `.github/workflows/ci.yml`
- Create: `docs/frontend-testing-troubleshooting.md`

Every failure should retain:

- HTML report.
- Trace on first failure.
- Screenshot at failure.
- Console/page errors.
- Browser, viewport, locale, theme, reduced-motion and fixture state.
- Failed geometry assertion with selector and bounding box.
- Request log for relevant API calls, with tokens and sensitive values redacted.

Add a small report summary that groups failures by screen, viewport, browser, locale, theme and invariant.

---

## 16. Final acceptance gates

The work is complete only when all of these are true:

- Every navigation view has a dedicated spec.
- Every user flow has a happy path, empty state, loading state and failure/recovery path where applicable.
- Observer/operator capability rules are covered at UI and request levels.
- All supported viewports have no unexpected overflow or clipping.
- Canonical dark/light/localized screenshots are reviewed and committed.
- Axe and keyboard suites pass.
- Chromium, Firefox and WebKit canonical suites pass.
- Production build Playwright suite passes.
- CI runs the same pnpm commands locally and remotely.
- No secrets, tokens or generated reports are committed.
- Backend tests, frontend tests, build, lint, type-check, i18n and package-manager guard pass.
- The release artifact is separately verified before installation.
- Live Home Assistant installation verification remains a separate final evidence item; passing Playwright does not claim live add-on success.

**Core commands:**

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:runtime
pnpm run test:ux
pnpm run build
pnpm run test:e2e
pnpm exec playwright test --project=chromium --grep @responsive
pnpm exec playwright test --project=chromium --grep @a11y
pnpm exec playwright test --project=chromium --grep @visual
cd ..
.venv/bin/python scripts/check_package_manager.py
.venv/bin/python scripts/check_frontend_i18n.py
.venv/bin/python -m pytest -m 'not live' --cov=homeassistant_gateway --cov-fail-under=85 -q
.venv/bin/ruff check src tests scripts
.venv/bin/python -m compileall -q src tests scripts
git diff --check
```

## Risks and trade-offs

- **Combinatorial explosion:** Full flows across every browser, viewport, locale, theme and state are too expensive and create noisy maintenance. Use all viewports for invariants, canonical viewports for full flows, and pairwise/nightly expansion.
- **Snapshot brittleness:** Dynamic content and animations must be frozen/masked. Snapshot updates require review.
- **False overflow failures:** Tables and diagnostic output intentionally scroll. Keep a small explicit allowlist and test the container itself.
- **Browser differences:** Do not require pixel-identical screenshots across engines. Require functional/accessibility/geometry parity; use engine-specific visual baselines only where needed.
- **Mock drift:** Fixture contracts can diverge from backend responses. Reuse backend response models/schema fixtures where possible and add an API contract test for important payloads.
- **Live environment gap:** Playwright against deterministic fixtures can prove UI behavior, not Supervisor/Ingress installation behavior. Keep artifact and live smoke gates separate.
- **Sensitive data:** Token issuance and diagnostics need redaction assertions; never store real Home Assistant data in snapshots or fixtures.

## Suggested implementation order

1. Coverage contract and reusable assertions.
2. Typed fixture/state builders.
3. Shell/navigation and viewport matrix.
4. Clients/policy flows, because they contain the most permission-sensitive UI.
5. Overview/health/topology.
6. MCP/audit/development console.
7. Accessibility/keyboard suite.
8. Production-build execution.
9. Visual snapshots and baseline review.
10. CI matrix, nightly expansion, reporting and documentation.

Each stage should be a separate reversible commit with focused tests first, then the full local gate, then CI verification.
