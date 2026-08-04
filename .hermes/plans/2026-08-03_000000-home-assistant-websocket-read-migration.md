# Home Assistant WebSocket Read Migration Implementation Plan

> **For Hermes:** Use the quality-first repository workflow and execute this plan task-by-task. Do not mix the pending UI/release changes in the working tree with the transport migration.

**Goal:** Migrate configuration, registry and activity reads toward the same authenticated Home Assistant WebSocket contracts used by the official frontend, while preserving the observer-only MCP contract, explicit fallbacks, testability and rollback.

**Architecture:** Keep `HomeAssistantReadPort` and its specialized application ports stable. Add a small, synchronous application-facing WebSocket read port backed by an infrastructure transport and protocol session; keep registry, activity and core/config mapping in separate adapters. Use WebSocket as primary only after an access/credential feasibility spike proves that the Supervisor environment supports it without adding a new secret. REST and template paths remain bounded, explicit fallbacks with evidence of which route was used.

**Tech Stack:** Python 3.11, FastAPI, httpx, a maintained WebSocket client compatible with the project runtime, typed protocols/dataclasses, pytest, Ruff, compileall, pip-audit, Home Assistant WebSocket API contracts, Supervisor add-on networking.

---

## Internet and upstream implementation evidence

The feasibility investigation found a documented and implemented Supervisor path, not merely a community workaround:

- Home Assistant Developer Docs, `App communication`, explicitly documents `ws://supervisor/core/websocket` as the Core WebSocket proxy for apps. It states that the proxy requires `SUPERVISOR_TOKEN` as the WebSocket password and that `homeassistant_api: true` enables Core API access.
- Current Supervisor source, `supervisor/api/proxy.py`, sends `auth_required`, reads `api_password` or `access_token` from the first client frame, resolves that value with `sys_apps.from_token(...)`, requires `app.access_homeassistant_api`, then returns `auth_ok` and proxies frames to Core.
- Current Supervisor source, `supervisor/homeassistant/websocket.py`, confirms the two official internal connection modes: Unix socket with peer authentication and TCP with the normal Core `auth_required`/`auth`/`auth_ok` handshake. The add-on must use the Supervisor proxy mode, not the Supervisor's private Unix-socket implementation.
- The official frontend uses `home-assistant-js-websocket` and sends registry commands such as `config/entity_registry/list` and `config/label_registry/list` through the authenticated connection.
- Node-RED's Home Assistant WebSocket ecosystem is a relevant external implementation. Its add-on mode is documented as using the Home Assistant add-on connection, and its public project history documents Supervisor-token migration, heartbeat support and reconnect/disconnect handling. This validates the integration pattern but does not replace live testing against our target Supervisor/Core versions.
- Supervisor issue #5028 shows a real failure mode: sending `SUPERVISOR_TOKEN` to `ws://supervisor/core/websocket` can produce `auth_invalid`/`Unauthorized WebSocket access` when the app token, `homeassistant_api` permission, installed image or runtime token source is inconsistent. Therefore the gateway must verify the exact runtime token and permission rather than infer feasibility from source alone.
- Node-RED issue history shows another operational constraint: very large WebSocket messages can cause disconnect/restart loops. Registry reads therefore require bounded message sizes, explicit failure classification and no silent truncation.

This evidence changes the feasibility hypothesis from "unknown whether a proxy exists" to "an official proxy exists; live validation must prove that this add-on's runtime token is accepted and that the target payloads fit safely".

---

## Non-negotiable constraints

- Read-only observer behavior only; do not add service calls, mutations, subscriptions that change HA state, or operator capabilities.
- Never log or return `SUPERVISOR_TOKEN`, a Home Assistant access token, WebSocket frames containing credentials, cookies, response bodies with secrets, or raw upstream exception text.
- Do not assume `SUPERVISOR_TOKEN` is valid for Home Assistant `/api/websocket`.
- Do not expose a new token configuration option until the security model, add-on configuration, documentation and migration/rollback are reviewed.
- Preserve existing MCP tool names and output semantics. Add transport evidence only in bounded technical fields where already supported.
- Keep every adapter file cohesive and small; no new god class or transport logic inside registry/history/core readers.
- Do not silently turn WebSocket `404`, auth failures, protocol errors, timeouts or empty results into success/empty data.
- Every implementation slice must have focused tests before integration tests and a clean diff before commit.

## Current evidence and assumptions

- The official Home Assistant frontend uses WebSocket commands for registry reads:
  - `config/entity_registry/list`
  - `config/entity_registry/list_for_display`
  - `config/label_registry/list`
  - area registry commands through the area registry WebSocket collection
- The official frontend uses `logbook/get_events` with `start_time`, optional `end_time`, `entity_ids`, `device_ids`; it also has `logbook/event_stream` for streaming activity.
- The gateway currently uses Supervisor REST at `http://supervisor/core/api`, with `SUPERVISOR_TOKEN`, plus `/template` fallbacks. Live MCP diagnostics work, while configuration/logbook/entity-registry currently report `home_assistant_unavailable` and labels return an empty result.
- The repository has specialized readers at:
  - `src/homeassistant_gateway/infrastructure/home_assistant/client.py`
  - `src/homeassistant_gateway/infrastructure/home_assistant/registry_reader.py`
  - `src/homeassistant_gateway/infrastructure/home_assistant/history_reader.py`
  - `src/homeassistant_gateway/infrastructure/home_assistant/core_reader.py`
- The working tree already contains an unrelated UI feature for copying only error/warning reports. Preserve it, test it separately, and do not include it accidentally in WebSocket commits.

---

## Phase 0 — Freeze scope and separate the working tree

### Task 0.1: Capture the current baseline

**Files:** no source changes.

Run:

```bash
cd /home/efraespada/homeassistant-gateway
git status --short
git diff --stat
.venv/bin/python -m pytest -q
.venv/bin/ruff check src tests scripts
.venv/bin/python -m compileall -q src tests scripts
cd frontend && pnpm run test:runtime && pnpm run test:ux && pnpm run check && pnpm run build
```

Expected: the current UI-only changes are visible in `git status`; existing gates pass. If any gate fails, record the failure and fix/separate it before beginning transport work.

### Task 0.2: Commit or stash only the existing UI slice

Do not combine the copy-error/warning-reports button with the transport migration. Either commit it under its own feature/release slice after its complete release gates, or create a clearly documented temporary branch/stash. Verify `git diff` before every WebSocket commit.

---

## Phase 1 — Feasibility spike: Supervisor-supported WebSocket access

This phase is a hard gate. If it cannot be completed safely, stop and implement the fallback strategy rather than guessing.

### Task 1.1: Inventory runtime routes without secrets

**Files:**
- Read: `addon/config.yaml`
- Read: `src/homeassistant_gateway/infrastructure/home_assistant/client.py`
- Read: Supervisor/Home Assistant official documentation
- Create: `.hermes/evidence/websocket-access-spike.md` (local evidence only; no tokens)

Determine whether the add-on can reach the documented Supervisor proxy from its network namespace:

```text
ws://supervisor/core/websocket
```

The first live probe must send the Home Assistant WebSocket auth frame using the runtime `SUPERVISOR_TOKEN` as `access_token` (the Supervisor proxy also accepts `api_password`), after confirming `addon/config.yaml` contains `homeassistant_api: true`. Do not rely on an Authorization header alone: the current Supervisor proxy authenticates from the first WebSocket JSON frame and checks the originating add-on permission.

Then execute one bounded read command, preferably `config/entity_registry/list`, and record only route name, status category, HA version, command name, count, latency and sanitized error code. Never record tokens or raw frames.

### Task 1.2: Define the authentication decision

Write an explicit decision table:

| Route | Credential | Supported by Supervisor/Core | Safe for this add-on | Decision |
|---|---|---:|---:|---|
| `/core/api/websocket` or documented proxy | existing Supervisor token | verify live | verify | primary candidate |
| Core `/api/websocket` | existing Supervisor token | verify live | likely no | reject unless documented |
| Core `/api/websocket` | new long-lived HA token | verify policy | requires new secret | do not add implicitly |

Acceptance criterion: no code is written until one route and credential model is proven live or the plan explicitly chooses REST/template as the supported path for this deployment.

### Task 1.3: Decide the transport library

Inspect current lock/dependency policy and select a maintained client. Prefer a client with a synchronous API or a narrow synchronous facade compatible with the existing reader design. Do not introduce an event loop into every reader.

Candidate decision order:

1. Existing project dependency, if it supports bounded sync WebSocket calls.
2. `websockets` synchronous client API, pinned to a compatible range and audited.
3. A small protocol implementation only if dependency addition is rejected and TLS/framing correctness can be tested; do not hand-roll WebSocket framing.

Acceptance criterion: the library supports connect timeout, message timeout, close, bounded message size, explicit auth handshake and deterministic test injection.

---

## Phase 2 — Application contracts and models

### Task 2.1: Add typed WebSocket read contracts

**Files:**
- Modify: `src/homeassistant_gateway/application/home_assistant.py`
- Test: `tests/test_home_assistant_ports.py` (create if absent)

Add a narrow protocol such as:

```python
class HomeAssistantWebSocketReadPort(Protocol):
    def call(self, command: str, payload: Mapping[str, Any] | None = None) -> Any: ...
```

Keep protocol/session details out of application services. Define typed error categories or extend `HomeAssistantUnavailable` with safe fields for:

- connection failure;
- auth rejection;
- protocol error;
- command error;
- timeout;
- payload validation failure.

Tests must assert that token values and raw frame content never appear in `str(error)` or returned diagnostics.

### Task 2.2: Define normalized read models

**Files:**
- Create: `src/homeassistant_gateway/application/home_assistant_models.py` only if existing models do not have a suitable home
- Modify: `src/homeassistant_gateway/application/home_assistant.py`
- Test: `tests/test_home_assistant_models.py`

Model only the fields needed by the MCP projection. Preserve unknown upstream fields only inside bounded redacted payloads when required for compatibility. Include explicit provenance internally (`websocket`, `rest`, `template`) so the result policy can distinguish source and fallback without exposing internals unnecessarily.

### Task 2.3: Add a transport factory boundary

**Files:**
- Modify: `src/homeassistant_gateway/infrastructure/home_assistant/__init__.py` or composition root
- Test: `tests/test_home_assistant_composition.py`

Inject the WebSocket port into the composed client. Default construction must remain deterministic and fail closed when WebSocket access is not configured/available. Avoid global singletons.

---

## Phase 3 — Infrastructure WebSocket session

### Task 3.1: Implement the protocol session

**Files:**
- Create: `src/homeassistant_gateway/infrastructure/home_assistant/websocket_protocol.py`
- Test: `tests/test_home_assistant_websocket_protocol.py`

Implement pure protocol logic around the injected socket:

1. Expect `auth_required`.
2. Send `auth` using the configured credential without logging it.
3. Require `auth_ok`; map `auth_invalid` to a sanitized auth error.
4. Send incrementing bounded request IDs.
5. Match `result` messages by ID.
6. Map `success=false` and command errors to typed safe errors.
7. Reject malformed messages, unexpected IDs and oversize payloads.
8. Close the socket on all error paths.

Tests must cover successful calls, auth failure, command failure, wrong ID, malformed JSON, timeout and close behavior with a fake socket.

### Task 3.2: Implement bounded connection lifecycle

**Files:**
- Create: `src/homeassistant_gateway/infrastructure/home_assistant/websocket_client.py`
- Test: `tests/test_homeassistant_websocket_client.py`

Provide a small client that:

- connects per bounded operation or uses a short-lived context-managed session;
- applies connect/read/message-size limits;
- performs one explicit retry only for connection-level transient failures;
- never retries auth rejection or command errors blindly;
- closes deterministically;
- accepts injected connector/socket factories for tests.

Do not implement background subscriptions in this migration. `logbook/event_stream` is out of scope unless a later requirement needs live streaming; `logbook/get_events` is enough for the current read operation.

### Task 3.3: Add dependency and supply-chain gates

**Files:**
- Modify: `pyproject.toml`
- Modify: lock/dependency file if present
- Test/CI: `.github/workflows/ci.yml`

Pin or constrain the selected WebSocket client, run `pip-audit`, and confirm the final image contains the dependency on amd64/arm64/arm/v7. Reject a dependency that cannot pass the existing audit policy.

---

## Phase 4 — Separate read adapters

### Task 4.1: Registry WebSocket adapter

**Files:**
- Create: `src/homeassistant_gateway/infrastructure/home_assistant/websocket_registry_reader.py`
- Modify: `src/homeassistant_gateway/infrastructure/home_assistant/registry_reader.py`
- Tests: `tests/test_home_assistant_websocket_registry_reader.py`, existing registry tests

Implement commands for:

- `config/entity_registry/list`;
- `config/entity_registry/list_for_display` when a bounded display projection is requested;
- `config/label_registry/list`;
- area/floor/device registry commands after confirming exact current command schemas from Core.

Normalize each response independently. On a WebSocket failure, call the existing REST/template fallback only when the error category is eligible and preserve the source/provenance internally. An empty successful WebSocket list must remain an empty successful list, not trigger a fallback.

### Task 4.2: Activity WebSocket adapter

**Files:**
- Create: `src/homeassistant_gateway/infrastructure/home_assistant/websocket_activity_reader.py`
- Modify: `src/homeassistant_gateway/infrastructure/home_assistant/history_reader.py`
- Tests: `tests/test_home_assistant_websocket_activity_reader.py`, existing history tests

Use `logbook/get_events` with:

- normalized UTC `start_time`;
- optional `end_time` if the application contract gains it;
- optional `entity_ids`/`device_ids` only when explicitly requested;
- bounded result count and payload validation.

Keep the existing history REST path separate. Do not conflate state history (`history/period`) with logbook activity (`logbook/get_events`).

### Task 4.3: Configuration/core adapter

**Files:**
- Create: `src/homeassistant_gateway/infrastructure/home_assistant/websocket_core_reader.py`
- Modify: `src/homeassistant_gateway/infrastructure/home_assistant/core_reader.py`
- Tests: `tests/test_home_assistant_websocket_core_reader.py`, existing core tests

Confirm the official read command for core configuration in the target HA version before implementing. If no supported WebSocket command provides the same safe configuration fields, keep `/config` as a separate REST read and report its exact sanitized failure. Do not fabricate configuration from registry data.

### Task 4.4: Compose specialized adapters

**Files:**
- Modify: `src/homeassistant_gateway/infrastructure/home_assistant/client.py`
- Modify: composition root that creates `SupervisorHomeAssistantClient`
- Tests: `tests/test_home_assistant_adapter.py`

The composed adapter should delegate to small readers. It must be possible to construct each reader with fake REST/WebSocket ports independently. Avoid adding branching for every operation in the composition root.

---

## Phase 5 — Result semantics, diagnostics and UI evidence

### Task 5.1: Preserve source and failure semantics

**Files:**
- Modify: `src/homeassistant_gateway/application/development_result_policy.py` if needed
- Modify: `src/homeassistant_gateway/presentation/mcp.py`
- Tests: `tests/test_development_result_policy.py`, MCP contract tests

Maintain:

- successful non-empty result → `status=ok`;
- successful empty result → `status=warning`, `reason=empty_result` where applicable;
- transport/protocol/upstream failure → `status=unavailable` or existing error contract;
- sanitized `code`, logical `path`/command and `http_status` where available.

Never classify a WebSocket auth failure as an empty result.

### Task 5.2: Complete error/warning copy action independently

**Files:**
- Existing pending UI files under `frontend/src/`
- `frontend/scripts/test-ux-contracts.mjs`

Finish and release the already-started button that copies only `error` and `warning` development results. Keep it in a separate commit from the WebSocket transport. Verify i18n for all 11 locales and do not let this slice block transport tests.

### Task 5.3: Document operator-visible diagnostics

**Files:**
- Modify: `docs/architecture.md`
- Create/modify: `docs/home-assistant-websocket-read-path.md`
- Modify: `README.md` only if installation/configuration behavior changes

Document:

- selected route and credential model;
- official HA WebSocket commands used;
- fallback order;
- safe error fields;
- why empty is different from unavailable;
- how to run the development probes and copy only failures;
- explicit unsupported-environment behavior.

---

## Phase 6 — Test matrix and live verification

### Task 6.1: Contract tests for every command

Add deterministic tests for each command response shape, unknown fields, empty lists, malformed payloads, command errors, auth failure, timeout, retry and close. Use fake sockets and fake REST clients; no real credentials.

### Task 6.2: Integration tests for fallback order

Prove these cases independently:

1. WebSocket success: REST is not called.
2. WebSocket successful empty list: REST is not called.
3. WebSocket connection timeout: eligible fallback is used and provenance is retained.
4. WebSocket auth rejection: no blind fallback if it could mask a credential problem.
5. WebSocket command error: safe error is returned or explicitly eligible fallback is used by policy.
6. Both paths fail: terminal unavailable result contains sanitized primary/fallback evidence.

### Task 6.3: Live smoke harness

**Files:**
- Modify: `scripts/live_smoke.py` or the existing live harness
- Document: `docs/home-assistant-websocket-read-path.md`

Run only against the authorized Home Assistant installation. Verify:

- gateway diagnostics/auth remain successful;
- configuration read;
- logbook read with a bounded 24-hour window;
- entity registry count and sample shape;
- labels count and sample shape;
- areas/floors/devices if implemented;
- no token appears in output or logs;
- returned counts are compared with the official frontend-visible data where possible.

If the WebSocket route is inaccessible from Supervisor, record the blocker and verify the safe fallback path instead; do not call the migration complete.

### Task 6.4: Full gates

Run:

```bash
.venv/bin/python -m pytest -q
.venv/bin/ruff check src tests scripts
.venv/bin/python -m compileall -q src tests scripts
.venv/bin/pip-audit --skip-editable
python scripts/check_frontend_i18n.py
python scripts/check_frontend_i18n_runtime.py
cd frontend && pnpm run test:runtime && pnpm run test:ux && pnpm run check && pnpm run build
cd .. && git diff --check
```

Expected: all commands pass with real output. Add targeted WebSocket tests to CI and keep live smoke disabled in CI unless a secured authorized target is configured.

---

## Phase 7 — Release, rollback and post-release verification

### Task 7.1: Release metadata and commits

Use separate focused commits:

1. `feat: add bounded home assistant websocket read transport`
2. `feat: migrate registry and logbook reads to websocket`
3. `test: cover websocket fallback and sanitized failures`
4. `docs: document home assistant websocket read path`
5. release commit/version only after all gates pass

Do not increment the version for a local green build before checking the actual current published release and changelog state.

### Task 7.2: CI and artifact verification

Push only after local gates pass. Verify:

- CI backend/frontend jobs;
- dependency audit;
- Release App;
- Trivy scan;
- GitHub tag/release points to the intended commit;
- GHCR manifest contains `linux/amd64`, `linux/arm64`, `linux/arm/v7`.

### Task 7.3: Live cutover and rollback

Deploy the new image only after the artifact is verified. Run the live smoke harness and MCP tools. Keep the previous known-good image/tag as rollback target.

Rollback procedure:

1. stop/update the add-on to the previous image/tag;
2. verify `gateway_diagnostics`, `ha_states`, `ha_logbook`, `ha_entity_registry`;
3. preserve sanitized failure evidence;
4. do not delete data or rotate credentials as part of transport rollback.

### Task 7.4: Close the plan with evidence levels

Final report must separate:

- local source/tests;
- remote CI/release/scanner;
- published artifact/manifest;
- live Supervisor/Home Assistant verification;
- unsupported or still-blocked routes.

Do not call the migration complete if only local tests pass.

---

## Risks and decisions requiring explicit evidence

- **Supervisor may not proxy WebSocket:** REST/template fallback may remain the correct supported implementation for this add-on unless an official internal route exists.
- **Credential mismatch:** `SUPERVISOR_TOKEN` may authenticate only Supervisor API, not Core WebSocket. Never solve this by silently adding a long-lived HA token.
- **WebSocket command drift:** validate command schemas against the target HA Core version and support bounded version-tolerant parsing, not arbitrary guessing.
- **Concurrency:** use short-lived calls first. Persistent connections/subscriptions add lifecycle, reconnect and shutdown complexity and are not needed for bounded read probes.
- **Payload size:** entity registries can be large. Enforce message/result limits and return a clear bounded-data error rather than truncating silently.
- **Security:** WebSocket error frames and configuration data can contain sensitive values. Reuse redaction and allowlisted projections before crossing the application/MCP boundary.
- **Operational availability:** an HA restart during a read must end in a terminal, classified result; it must not leave development jobs running indefinitely.

## Definition of done

- Feasibility route and auth are proven live or explicitly rejected.
- WebSocket protocol/session is isolated, bounded, injectable and fully tested.
- Registry and activity readers are separate files with stable application ports.
- REST/template fallback is explicit, safe and observable.
- Empty, warning, unavailable and protocol/auth failures remain distinct.
- All local gates, CI, release, scanner, manifest and live verification pass.
- Documentation and rollback are complete.
