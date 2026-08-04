# Frontend Clean Architecture and Testing Improvements Implementation Plan

> **For Hermes:** Use the `plan` and `test-driven-development` workflows when implementing this plan. Execute one slice at a time, keep every slice reversible, and do not start the next slice until the current slice passes all required gates.

**Goal:** Complete the frontend Clean Architecture and testing improvements around `main.ts`, the lifecycle/API controller, policy autosave, typed errors, async operation state, transport validation, concurrency, composition, documentation, and layered verification without changing user-visible behavior.

**Architecture:** Keep `GatewayApp` as the Lit composition root and presentation façade. Keep browser APIs, translation lookup, and rendered UI in the presentation layer. Keep use-case coordination in application services/controllers, transport DTOs and HTTP request behavior in infrastructure, and pure authorization/policy rules in dependency-free modules. Dependencies must point inward: presentation → application → ports; infrastructure implements ports and must not be imported by pure application rules.

**Tech Stack:** TypeScript, Lit, Vite, pnpm `11.15.1`, Node runtime helper tests, Playwright, Python/pytest backend tests, GitHub Actions.

---

## Current Baseline and Constraints

- Repository: `/home/efraespada/homeassistant-gateway`
- Branch: `main`
- Latest release: `v0.5.24`; no new release during this refactor.
- Existing frontend extraction commits include `app-styles.ts`, `i18n-base.ts`, `capability-policy.ts`, `operator-policy.ts`, `gateway-api.ts`, and `gateway-controller.ts`.
- Latest lifecycle/controller commit: `abfe7f0`.
- Existing CI is required to remain green before each subsequent slice.
- Use only `pnpm`; never use npm, npx, Yarn, or Bun.
- Do not call real Home Assistant mutation endpoints. Browser tests must use deterministic mocks.
- Preserve the current UI, responsive layout, accessibility, translations, reduced motion behavior, autosave semantics, and error translation.
- Repository code and documentation remain in English; locale data remains localized.
- Do not store credentials, tokens, connection strings, or secrets in source, fixtures, screenshots, plans, or test output.

## Non-goals

- Do not introduce a frontend framework migration.
- Do not split files only because they are large.
- Do not create a generic service locator or dependency-injection framework.
- Do not add runtime schema dependencies unless the existing dependency and bundle impact are measured and justified.
- Do not change backend authorization semantics in this plan.
- Do not publish a release until every phase and release gate is green.

---

# Phase 0: Baseline and Architectural Guardrails

### Task 0.1: Capture the clean baseline

**Objective:** Record the exact state before changing behavior.

**Files:**
- Read: `frontend/src/main.ts`
- Read: `frontend/src/gateway-api.ts`
- Read: `frontend/src/gateway-controller.ts`
- Read: `frontend/scripts/test-runtime.mjs`
- Read: `frontend/package.json`
- Read: `.github/workflows/ci.yml`

**Steps:**

1. Run:

   ```bash
   cd /home/efraespada/homeassistant-gateway/frontend
   pnpm run test:runtime
   pnpm run check
   pnpm run build
   pnpm run test:ux
   python3 ../scripts/check_frontend_i18n.py
   ```

2. Run from the repository root:

   ```bash
   PYTHONPATH=. .venv/bin/python -m pytest -q
   git diff --check
   git status --short --branch
   ```

3. Run the existing relevant Playwright projects with deterministic mocks.

**Acceptance:** All current gates pass, the worktree is clean, and the baseline is recorded in the implementation issue/PR notes without copying volatile tokens or IDs into repository documentation.

### Task 0.2: Add a lightweight import-boundary check

**Objective:** Prevent pure application/policy modules from importing Lit, browser globals, or infrastructure directly.

**Files:**
- Create: `frontend/scripts/check-architecture-boundaries.mjs`
- Modify: `frontend/package.json`
- Modify: `.github/workflows/ci.yml` if the existing frontend job does not run it

**Rules to enforce:**

- `capability-policy.ts`, `operator-policy.ts`, application contracts, and controller modules must not import `lit`, `./api`, or browser globals.
- `gateway-api.ts` may import the low-level `api.ts` adapter.
- `main.ts` may import presentation modules and the composition root.
- The check must fail with a useful file/import message.

**Tests:** Run the script against both valid and intentionally invalid temporary fixtures. Do not add an invalid fixture to the repository.

**Acceptance:** The architecture check runs locally and in CI and passes on the current tree.

**Commit:** `test(frontend): enforce clean architecture import boundaries`

---

# Phase 1: Typed Transport Errors

### Task 1.1: Define application error codes and typed errors

**Objective:** Replace string comparison of `Error.message` with stable error codes.

**Files:**
- Create: `frontend/src/gateway-errors.ts`
- Test: `frontend/scripts/test-runtime.mjs`

**Design:**

```ts
export type GatewayErrorCode =
  | 'network_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'operator_service_policy_invalid'
  | 'invalid_response'
  | 'server_error'
  | 'unknown_error';

export class GatewayError extends Error {
  constructor(
    readonly code: GatewayErrorCode,
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}
```

**Tests:**

- code and status are retained;
- `instanceof GatewayError` works;
- unknown causes can be wrapped without exposing secrets;
- the original error is available only as a cause and is never rendered directly.

### Task 1.2: Normalize HTTP failures in the low-level API adapter

**Objective:** Ensure every HTTP failure crossing the infrastructure boundary becomes a `GatewayError`.

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/gateway-api.ts`
- Test: `frontend/scripts/test-runtime.mjs`

**Rules:**

- Preserve endpoint status and stable backend error code when available.
- Map `401` to `unauthorized`, `403` to `forbidden`, `404` to `not_found`, `422` to `validation_error`, and `5xx` to `server_error`.
- Map `operator_service_policy_invalid` explicitly.
- Map fetch/network failures to `network_error`.
- Never expose response bodies containing tokens or authorization headers.
- Preserve the existing successful response behavior.

**Tests:** Fake requests must cover each status/code mapping and a malformed error body.

### Task 1.3: Translate typed errors in the presentation layer

**Objective:** Keep translation decisions in `GatewayApp` and prevent raw backend codes/messages from reaching users.

**Files:**
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/i18n-base.ts`
- Modify locale files only if coverage requires new keys
- Test: `frontend/scripts/test-runtime.mjs`
- Test: relevant Playwright error fixtures

**Design:** Add one presentation helper:

```ts
private errorMessage(error: unknown, fallbackKey: TranslationKey): string
```

The helper maps `GatewayError.code` to translation keys and uses a safe fallback for unknown errors.

**Acceptance:** `operator_service_policy_invalid` remains translated in all 11 locales; no raw backend error code is displayed.

**Commit:** `refactor(frontend): introduce typed gateway errors`

---

# Phase 2: Application Operation State

### Task 2.1: Define operation names and state transitions

**Objective:** Model asynchronous UI operations explicitly instead of scattering `busy` and `error` mutations.

**Files:**
- Create: `frontend/src/operation-state.ts`
- Test: `frontend/scripts/test-runtime.mjs`

**Design:**

```ts
export type GatewayOperation =
  | 'bootstrap'
  | 'create_client'
  | 'revoke_client'
  | 'rotate_client'
  | 'discovery'
  | 'audit'
  | 'operator_policy'
  | 'policy_evaluation'
  | 'development_job';

export type OperationState =
  | { status: 'idle' }
  | { status: 'running'; operation: GatewayOperation; id: number }
  | { status: 'success'; operation: GatewayOperation; id: number }
  | { status: 'error'; operation: GatewayOperation; id: number; error: GatewayError };
```

**Tests:**

- valid state transitions;
- operation IDs are monotonic;
- an older completion cannot replace a newer running operation;
- error states retain typed codes;
- idle state contains no stale error.

### Task 2.2: Implement an application-level operation runner

**Objective:** Centralize execution, stale-result handling, and error propagation without importing Lit or browser globals.

**Files:**
- Create: `frontend/src/operation-runner.ts`
- Test: `frontend/scripts/test-runtime.mjs`

**Interface:**

```ts
export interface OperationRunner {
  run<T>(
    operation: GatewayOperation,
    task: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  cancel(operation?: GatewayOperation): void;
}
```

The implementation must be usable in Node runtime tests and must not mutate `GatewayApp`.

**Tests:**

- success;
- typed failure;
- cancellation;
- overlapping operations;
- stale result ignored;
- cancellation does not become a user-visible generic error.

### Task 2.3: Integrate operation state into `GatewayApp`

**Objective:** Make presentation state a projection of application operation results.

**Files:**
- Modify: `frontend/src/main.ts`
- Modify: views only if selectors need the active operation name
- Test: relevant Playwright error/loading tests

**Rules:**

- Preserve the existing public visual behavior.
- Keep Lit `@state` properties in `GatewayApp`.
- Replace duplicated `busy/error` blocks incrementally, one operation at a time.
- Ensure the UI does not become idle while a second operation is pending.
- Ensure retry returns from `error` to `running` and then `ready`.

**Acceptance:** Existing boot, error/recovery, client, policy, audit, discovery, and development flows remain visually and behaviorally unchanged.

**Commit:** `refactor(frontend): centralize async operation state`

---

# Phase 3: Autosave as an Application Use Case

### Task 3.1: Define the policy persistence port

**Objective:** Give serialized policy persistence its own explicit application boundary.

**Files:**
- Create: `frontend/src/operator-policy-service.ts`
- Modify: `frontend/src/gateway-controller.ts`
- Test: `frontend/scripts/test-runtime.mjs`

**Interface:**

```ts
export interface OperatorPolicyService {
  save(selected: readonly string[]): Promise<void>;
}
```

The service must copy the selected IDs before enqueueing them.

### Task 3.2: Move serialization out of `main.ts`

**Objective:** Remove `operatorPolicySaveQueue` from the Lit component.

**Files:**
- Modify: `frontend/src/operator-policy-service.ts`
- Modify: `frontend/src/gateway-controller.ts`
- Modify: `frontend/src/main.ts`

**Required semantics:**

- sequential writes;
- captured immutable snapshots;
- a failed write does not poison the queue;
- later writes still execute;
- the controller exposes the rejected promise so the UI can translate it;
- busy state is managed by the operation runner rather than by queue internals.

### Task 3.3: Add autosave concurrency and failure tests

**Tests:** `frontend/scripts/test-runtime.mjs`

Cases:

1. first save resolves before second request starts;
2. selected IDs are copied at enqueue time;
3. first save fails and second still runs;
4. policy-invalid maps to the typed error code;
5. three rapid toggles produce three ordered snapshots;
6. no unhandled rejection is created.

### Task 3.4: Add E2E regression for rapid policy changes

**Files:**
- Modify: `frontend/e2e/policy.spec.ts`
- Modify: deterministic mock fixture/helper used by policy tests

**Scenario:** Perform several group/individual changes rapidly, delay mock responses, and assert the final UI and final persisted payload are deterministic.

**Commit:** `refactor(frontend): move policy autosave into application service`

---

# Phase 4: DTOs, Mappers, and Runtime Response Validation

### Task 4.1: Separate transport DTO contracts from application contracts

**Objective:** Stop treating raw HTTP payloads as trusted application models.

**Files:**
- Create: `frontend/src/transport/gateway-dtos.ts`
- Create: `frontend/src/application/gateway-contracts.ts`
- Modify: `frontend/src/gateway-api.ts`
- Modify: `frontend/src/gateway-controller.ts`
- Test: `frontend/scripts/test-runtime.mjs`

Start with these contracts only:

- `ReadyDto` / `Ready`;
- `ClientDto` / `Client`;
- `OperatorStatusDto` / `OperatorStatus`;
- `OperatorServicePolicyDto` / `OperatorServicePolicy`;
- `GatewayBootstrapDto` / `GatewayBootstrap`.

Do not mechanically duplicate every existing model.

### Task 4.2: Add mappers for high-risk responses

**Objective:** Convert DTOs to stable application models at the infrastructure boundary.

**Files:**
- Create: `frontend/src/transport/gateway-mappers.ts`
- Test: `frontend/scripts/test-runtime.mjs`

**Rules:**

- normalize missing optional collections to safe empty collections only when the contract explicitly permits it;
- reject invalid required fields;
- never silently coerce authorization-sensitive fields;
- keep mapping deterministic and pure.

### Task 4.3: Add runtime guards

**Objective:** Fail safely on malformed, partial, old, or unexpected HTTP responses.

**Files:**
- Create: `frontend/src/transport/gateway-guards.ts`
- Test: `frontend/scripts/test-runtime.mjs`

**Cases:**

- valid bootstrap;
- `null` response;
- HTML/error string response;
- missing required field;
- invalid client profile;
- invalid operator status;
- malformed policy selection;
- duplicate services;
- unexpected extra fields (accepted unless security-sensitive).

Invalid responses must produce `GatewayError('invalid_response', ...)` without exposing raw payloads.

### Task 4.4: Add contract fixtures for response compatibility

**Files:**
- Create: `frontend/test-fixtures/gateway-responses.ts`
- Create: `frontend/scripts/test-gateway-contracts.mjs`
- Modify: `frontend/package.json`
- Modify: `.github/workflows/ci.yml`

Use sanitized deterministic fixtures only. Validate every bootstrap endpoint fixture and every mutation response fixture.

**Commit:** `refactor(frontend): validate gateway transport contracts`

---

# Phase 5: Cancellation, Ordering, and Refresh Consistency

### Task 5.1: Add request cancellation to the request port

**Objective:** Allow application operations to cancel obsolete requests.

**Files:**
- Modify: `frontend/src/gateway-api.ts`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/operation-runner.ts`
- Test: `frontend/scripts/test-runtime.mjs`

The request signature must accept `AbortSignal` through `RequestInit` without coupling application modules to `fetch`.

### Task 5.2: Protect bootstrap from stale responses

**Objective:** Prevent an older refresh from overwriting newer state.

**Files:**
- Modify: `frontend/src/gateway-controller.ts`
- Modify: `frontend/src/main.ts`
- Test: `frontend/scripts/test-runtime.mjs`

Preferred behavior:

- each refresh receives a generation/request ID;
- only the current generation can be applied;
- a mutation invalidates older bootstrap generations;
- canceled requests do not render error banners.

### Task 5.3: Add delayed-response E2E coverage

**Files:**
- Modify: `frontend/e2e/error-states.spec.ts`
- Modify: `frontend/e2e/clients.spec.ts`
- Modify: `frontend/e2e/policy.spec.ts`

Scenarios:

- refresh followed by mutation;
- audit filter changed twice before the first response;
- discovery submitted twice;
- policy autosave under delayed responses;
- canceled request followed by successful retry.

**Commit:** `test(frontend): cover stale responses and cancellation`

---

# Phase 6: Explicit Frontend Composition Root

### Task 6.1: Define frontend dependency contracts

**Objective:** Make production wiring and test wiring explicit.

**Files:**
- Create: `frontend/src/app-dependencies.ts`
- Modify: `frontend/src/main.ts`
- Modify: entrypoint module that defines/registers `gateway-app`

**Design:**

```ts
export type GatewayAppDependencies = {
  gatewayApi: GatewayApi;
  gatewayController: GatewayController;
  operationRunner: OperationRunner;
};

export function createGatewayAppDependencies(
  request: Request = api,
): GatewayAppDependencies {
  const gatewayApi = createGatewayApi(request);
  const gatewayController = createGatewayController(gatewayApi);
  const operationRunner = createOperationRunner();
  return { gatewayApi, gatewayController, operationRunner };
}
```

Do not add a general-purpose container or service locator.

### Task 6.2: Inject dependencies into `GatewayApp`

**Objective:** Ensure tests can construct the component with fakes while production has one obvious composition root.

**Files:**
- Modify: `frontend/src/main.ts`
- Modify: frontend entrypoint
- Test: runtime/controller integration test

**Acceptance:**

- production still registers and boots `gateway-app` normally;
- tests can inject a fake controller and runner;
- no infrastructure constructor logic remains hidden in view methods.

### Task 6.3: Add composition-root integration test

**Files:**
- Create: `frontend/scripts/test-composition.mjs`
- Modify: `frontend/package.json`
- Modify: `.github/workflows/ci.yml`

Verify that production dependencies are wired once and that fake dependencies can be supplied without network access.

**Commit:** `refactor(frontend): make application composition explicit`

---

# Phase 7: Comprehensive Layered Testing

### Task 7.1: Expand pure policy tests with table-driven cases

**Files:**
- Modify: `frontend/scripts/test-runtime.mjs`
- Optionally create: `frontend/scripts/test-policy-cases.mjs`

Cover:

- observer write prohibition;
- operator capability selection;
- global/client grant intersection;
- disabled global service retained but ineffective;
- duplicate and unsorted IDs;
- empty policy;
- unknown service IDs;
- idempotent select/deselect behavior.

### Task 7.2: Add controller failure-path tests

**Files:**
- Modify: `frontend/scripts/test-runtime.mjs`

Cover:

- bootstrap partial failure;
- mutation failure without bootstrap call;
- successful mutation with failed follow-up bootstrap;
- rotate/revoke error propagation;
- discovery/audit/evaluation error propagation;
- typed error identity and code preservation.

### Task 7.3: Add adapter request contract tests

**Files:**
- Modify: `frontend/scripts/test-runtime.mjs`
- Create: `frontend/scripts/test-gateway-api.mjs` if the runtime script becomes too large

Verify:

- every HTTP method and path;
- encoded client IDs;
- bearer header handling;
- query encoding;
- JSON bodies;
- bootstrap parallel request set;
- no token appears in logs/errors.

### Task 7.4: Add mutation testing or equivalent negative checks

**Objective:** Demonstrate that important policy and controller assertions fail when behavior is changed.

**Files:**
- Create: `frontend/scripts/test-negative-contracts.mjs`

If a mutation-testing tool is not appropriate for the current toolchain, implement explicit negative contract checks covering permission inversion, missing refresh, and dropped error codes.

### Task 7.5: Add coverage thresholds without weakening existing gates

**Files:**
- Modify: frontend test scripts/configuration
- Modify: `.github/workflows/ci.yml`
- Documentation: `docs/testing/frontend.md`

Track separately:

- pure application logic coverage;
- adapter contract coverage;
- browser flow coverage.

Do not use global line coverage as the only quality metric. Establish a baseline first, then raise thresholds incrementally. CI must fail if a threshold regresses.

**Commit:** `test(frontend): strengthen application and transport coverage`

---

# Phase 8: E2E and Accessibility Matrix Completion

### Task 8.1: Convert deterministic fixtures into typed state builders

**Files:**
- Create or modify: `frontend/e2e/fixtures/gateway-state.ts`
- Modify: existing mock server/route fixture files
- Modify: `frontend/e2e/*.spec.ts`

Required states:

- loading;
- ready empty;
- ready populated;
- operator disabled;
- operator enabled;
- global services empty;
- global services populated;
- API unauthorized;
- API validation error;
- API policy-invalid error;
- delayed request;
- malformed response;
- development job queued/running/success/failure;
- long content and Unicode;
- RTL locale;
- dark/light/auto theme.

### Task 8.2: Add all operation-flow E2E tests

Cover:

- bootstrap retry;
- create client and one-time token display;
- revoke and rotate;
- discovery success/failure;
- audit filtering;
- policy evaluation;
- policy autosave and error recovery;
- development job progress and cancellation if supported;
- navigation during pending operations.

### Task 8.3: Complete browser matrix

Use the existing plan and keep tiers:

- PR: Chromium, core responsive viewports, accessibility, deterministic error flows;
- CI/release: Chromium, Firefox, WebKit where available, Mobile Chromium, visual baselines;
- nightly: all planned viewports/locales/themes/states.

Keep retries limited to infrastructure failures and preserve traces/videos on failure.

### Task 8.4: Add accessibility assertions for async states

Verify:

- loading announcements;
- error live regions;
- retry button accessible name;
- disabled controls while the relevant operation is pending;
- focus restoration after modal close;
- focus remains visible after errors;
- no inaccessible raw error codes;
- keyboard access to policy groups and client actions.

**Commit:** `test(frontend): complete lifecycle and async browser coverage`

---

# Phase 9: Documentation and Developer Contracts

### Task 9.1: Document frontend architecture

**Files:**
- Create: `docs/frontend/architecture.md`
- Modify: `README.md` only if a user-facing link is appropriate

Document:

- layer diagram;
- composition root;
- `GatewayController` responsibilities;
- `GatewayApi` port;
- transport adapter;
- error mapping;
- operation state;
- autosave serialization;
- allowed dependency directions;
- what must remain in `GatewayApp`.

### Task 9.2: Document testing strategy

**Files:**
- Create: `docs/frontend/testing.md`

Document exact pnpm commands:

```bash
pnpm run test:runtime
pnpm run test:contracts
pnpm run check
pnpm run build
pnpm run test:ux
pnpm exec playwright test
```

Explain which layer each test belongs to and when to add runtime, contract, or E2E coverage.

### Task 9.3: Add contributor guidance for new API operations

**Files:**
- Modify: `AGENTS.md` or the repository's existing contributor guidance

Require new operations to provide:

1. application interface;
2. infrastructure adapter mapping;
3. typed success/error contract;
4. runtime contract test;
5. E2E test if user-visible;
6. i18n coverage for user-visible errors;
7. architecture-boundary compliance.

**Commit:** `docs(frontend): document application boundaries and testing`

---

# Phase 10: Final Audit and Release Readiness

### Task 10.1: Audit for remaining infrastructure calls in presentation

**Commands:**

```bash
search_files("api<|fetch(|RequestInit|operatorPolicySaveQueue", target="content", path="frontend/src")
```

Expected result:

- direct API calls only in the infrastructure adapter/composition root;
- no `operatorPolicySaveQueue` in `main.ts` after Phase 3;
- no raw backend error comparisons in views/main;
- no transport DTO assumptions in pure policy modules.

### Task 10.2: Run the complete local quality gate

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run test:runtime
pnpm run test:contracts
pnpm run check
pnpm run build
pnpm run test:ux
python3 ../scripts/check_frontend_i18n.py
pnpm exec playwright test --project=chromium --project=firefox --project=mobile-chromium --workers=3

cd ..
PYTHONPATH=. .venv/bin/python -m pytest -q
git diff --check
python3 scripts/check_package_manager.py
git status --short --branch
```

### Task 10.3: Verify production artifact separately

- Run the production preview smoke suite.
- Verify the built bundle, not only the development server.
- Run container smoke only against deterministic/local test targets.
- Confirm no secret-like values occur in source, fixtures, reports, or artifacts.

### Task 10.4: Review the final diff and architecture

Review:

- dependency direction;
- public contracts;
- error behavior;
- cancellation and stale results;
- autosave ordering;
- UI behavior and translations;
- test quality rather than only test count;
- documentation accuracy.

### Task 10.5: Commit, push, and verify CI

- Keep one focused commit per phase/slice.
- Push only after local gates pass.
- Watch the full workflow with `gh run watch --exit-status`.
- Query `gh run view` after watching to confirm `status=completed` and `conclusion=success`.
- Do not report CI as green based on a timeout.
- Do not publish a release until the final artifact and CI are independently verified.

---

# Definition of Done

The work is complete only when all of the following are true:

- `GatewayApp` remains the Lit presentation/composition façade, not an HTTP client.
- Application coordination is exposed through explicit interfaces and tested independently.
- No pure application module imports Lit, browser globals, or infrastructure.
- HTTP errors are normalized into typed errors.
- User-visible messages are translated by stable error codes.
- Operator Policy autosave is serialized outside `main.ts` and has concurrency/failure tests.
- Async operations have explicit state and stale-result protection.
- Transport DTOs are validated before entering application/UI state.
- Bootstrap/mutation ordering is covered by runtime tests.
- Error, cancellation, delayed-response, and malformed-response paths are covered.
- E2E uses typed deterministic fixtures and covers development and production artifacts.
- Accessibility, responsive, i18n, reduced motion, themes, RTL, and long-content cases remain green.
- Coverage thresholds are explicit and cannot regress silently.
- Architecture and testing documentation is current and consumer-readable.
- Local gates, backend tests, production smoke, and CI are all green.
- Worktree is clean and no new release is published until separately approved.

# Risks and Trade-offs

- **Over-abstraction:** Keep each interface tied to a real use case. Reject wrappers that only rename one HTTP method.
- **DTO duplication:** Start with high-risk contracts only; do not duplicate all models without a concrete boundary need.
- **Bundle size:** Prefer dependency-free guards and existing tooling unless a schema library has a measured benefit.
- **Concurrency complexity:** Preserve current user-visible behavior and add delayed deterministic tests before changing scheduling semantics.
- **Error translation drift:** Validate all 11 locales after adding or renaming error keys.
- **Test duration:** Keep fast runtime/contract tests in PR CI and reserve the full browser matrix for release/nightly tiers where appropriate.
- **Migration safety:** Every phase must compile, pass local gates, and be independently revertible.
