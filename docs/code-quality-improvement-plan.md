# Code Quality Improvement Plan

## Baseline

- Repository: `vypdev/homeassistant-gateway`
- Baseline commit: `344173a1be80cba7004befd615b827baf0e5d6c2`
- Branch: `main`
- Baseline tree: clean and aligned with `origin/main`
- RepoWise: `0.42.0`
- Graphify: `graphifyy==0.9.46`, isolated temporary environment

## Evidence and scope

RepoWise and Graphify are advisory analysis tools. They identify candidates and
relationships; they do not authorize refactoring by themselves. Every change
must be validated against current production callers, semantic contracts,
composition roots, focused tests, and global gates.

The baseline RepoWise report identified candidates in:

- `src/homeassistant_gateway/infrastructure/home_assistant/history_reader.py`
- `src/homeassistant_gateway/application/development.py`
- `src/homeassistant_gateway/application/development_jobs.py`
- `src/homeassistant_gateway/presentation/http.py`
- `src/homeassistant_gateway/presentation/development_routes.py`
- `frontend/src/gateway-contracts.ts`
- `frontend/src/development-view.ts`
- `frontend/src/clients-view.ts`
- `frontend/src/ui/ui-primitives.ts`
- `frontend/src/models.ts`

It also reported duplication candidates and a possible dependency cycle between
`websocket_client.py` and `client.py`. The directed dependency claim must be
verified from current production imports; Graphify's connectivity graph is not
proof of directed acyclicity.

The baseline Graphify index contained 2,046 nodes, 3,999 edges, and 150
communities. Generated graph output is not source-of-truth and is not committed.

## Verified execution results

- The reported WebSocket/HTTP cycle was not a directed production cycle. A
  deterministic AST/SCC check found 56 production modules, 117 import edges,
  and zero strongly connected components with more than one module.
- The directed-cycle check is now an executable repository contract test.
- The historical logbook timeout was reproduced as a nondeterministic,
  wall-clock-dependent test seam. The focused test passed in isolation but could
  stall when the full adapter file ran because a fixed historical start date was
  combined with the live clock.
- `SupervisorHistoryReader` now exposes a private `_now_utc()` seam. The public
  API is unchanged and the regression test uses a fixed clock.
- The complete Home Assistant adapter test file passes (`31 passed`).
- The complete Python suite passes (`161 passed`).
- Frontend TypeScript, architecture boundaries, and Vite build pass when run
  from `frontend/` with the repository-declared pnpm version.
- RepoWise hotspots in development and frontend were reviewed against callers
  and existing contracts. They remain candidates for future vertical slices,
  not automatic extraction instructions.

## Execution order

### Block 1 — Dependency direction

1. Inspect the current imports and callers of the WebSocket and HTTP clients.
2. Define the narrowest semantic boundary needed to invert the dependency.
3. Add or strengthen a deterministic architecture test.
4. Make one vertical change and run focused tests plus import checks.

Exit criteria: no unjustified production cycle, behavior preserved, focused
tests green, and no generated artifacts.

### Block 2 — History and logbook

1. Map `history_reader.py` responsibilities and all callers.
2. Preserve HTTP/WebSocket fallback, ordering, deduplication, and timeout
   semantics.
3. Extract only independently changing policies or adapters.
4. Add regression tests for window overlap, deduplication, ordering, empty
   responses, and failures.

Exit criteria: the logbook contract is explicit and fully exercised.

### Block 3 — Development application

1. Partition runner, job execution, tracing, and result policy by semantic
   responsibility.
2. Keep composition explicit and avoid universal coordinators.
3. Increase coverage for error, timeout, cancellation, and partial-result paths.

Exit criteria: lower accidental complexity without changing public behavior.

### Block 4 — Frontend contracts and views

1. Inspect the actual contract predicates and view data flow.
2. Extract named semantic predicates/view-model helpers only where ownership is
   clear.
3. Add focused unit/architecture tests and run the required `pnpm` gates.

Exit criteria: contract validation and views remain behaviorally equivalent and
are easier to test.

### Block 5 — Duplication

1. Re-check each RepoWise duplicate against current callers.
2. Extract only genuinely shared semantics.
3. Keep storage and presentation policies separate when their failure or data
   contracts differ.

Exit criteria: no universal helper or cosmetic abstraction is introduced.

### Block 6 — Final verification

Run, using the repository's official environment:

```text
.venv/bin/python -m compileall -q src scripts tests
.venv/bin/python -m pytest
corepack pnpm --dir frontend run check
corepack pnpm --dir frontend run test:architecture
corepack pnpm --dir frontend run build
repowise health --no-workspace --refactoring-targets --format json .
graphify update .
git diff --check
```

The final candidate must have a clean tree, reproducible outputs, and successful
CI on the exact pushed SHA. Metrics will be compared as evidence, not optimized
as an end in themselves.

## Non-goals

- No automatic deletion of builders, facades, adapters, or composition roots.
- No weakening of security or architecture gates.
- No generated RepoWise or Graphify reports committed by default.
- No release publication triggered by this plan without a separately verified
  release candidate.
