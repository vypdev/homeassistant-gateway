# Home Assistant Container Support Plan

## Status

**Planning complete. Implementation not started.**

This plan adds an official standalone Docker deployment for Home Assistant Container while preserving the existing Home Assistant OS/Supervised App deployment.

The plan is intentionally separated from the pending DevelopmentJobManager refactor.

## Goal

Support both deployment targets with one application core:

| Deployment target | Home Assistant connection | Gateway deployment |
| --- | --- | --- |
| Home Assistant OS/Supervised | Supervisor API and WebSocket API | Home Assistant App/Add-on with Ingress |
| Home Assistant Container | Home Assistant Core REST and WebSocket APIs | Independent Docker container / Compose |

The domain and application layers must remain unaware of Supervisor, Docker, HTTP clients, WebSockets, environment variables, and framework details.

## Non-goals

- Do not replace or weaken the existing Supervisor/App deployment.
- Do not create a second MCP product or duplicate application policies.
- Do not enable operator capabilities by default.
- Do not add Docker socket, host networking, privileged mode, SSH, shell, or arbitrary filesystem access.
- Do not expose a Home Assistant token through MCP, logs, traces, health responses, audit records, exceptions, or UI data.
- Do not publish standalone support before a real authenticated smoke test against Home Assistant Container.
- Do not mix this work with the DevelopmentJobManager cancellation refactor.

## Evidence baseline

Official Home Assistant contracts:

- REST API: `https://developers.home-assistant.io/docs/api/rest/`
- WebSocket API: `https://developers.home-assistant.io/docs/api/websocket/`
- Long-Lived Access Tokens: `https://www.home-assistant.io/docs/authentication/`
- Home Assistant Container installation: `https://www.home-assistant.io/installation/linux/`

Home Assistant Container provides Core REST and WebSocket APIs but not Supervisor, Ingress, Add-ons, `SUPERVISOR_TOKEN`, `hassio_api`, or `homeassistant_api`.

## Current repository findings

The current executable path reads `SUPERVISOR_TOKEN` and builds a Home Assistant client only when that token exists. The existing HTTP/WebSocket transport already accepts a configurable base URL and contains valuable bounded, redacted, timeout, retry, and trace behavior, but its public names and composition remain Supervisor-specific.

There is currently no official standalone Compose deployment, standalone configuration contract, standalone readiness contract, or standalone smoke test.

Version metadata is currently inconsistent and must be audited separately before release publication:

- `addon/config.yaml`: `0.5.34`;
- `pyproject.toml`: `0.5.31`;
- `README.md`: `0.5.32`;
- the add-on Dockerfile contains a historical default `GATEWAY_REF`.

## Architecture target

### Application boundary

Keep `HomeAssistantReadPort` and existing application policies as the semantic boundary. No application module may import:

- `os` or process configuration;
- `httpx`;
- `websockets`;
- Supervisor APIs;
- Docker or Compose types;
- FastAPI configuration details.

### Infrastructure boundary

Generalize the Home Assistant API transport so the same bounded REST/WebSocket behavior serves both modes. Remove Supervisor-specific names only after auditing all callers, updating composition and tests, and proving zero unintended legacy references.

Introduce a validated connection contract at the executable/composition boundary containing:

- explicit mode: `supervisor` or `standalone`;
- normalized REST API URL;
- normalized WebSocket API URL;
- secret credential reference/value held only at the infrastructure boundary.

Introduce a pure endpoint-resolution policy. It must normalize trailing slashes, reject unsupported schemes and embedded credentials, avoid duplicated `/api`, and produce sanitized diagnostic paths.

Expected resolutions:

```text
Supervisor:
  http://supervisor/core/api
  ws://supervisor/core/websocket

Standalone HTTP:
  http://homeassistant:8123/api
  ws://homeassistant:8123/api/websocket

Standalone HTTPS:
  https://ha.example.com/api
  wss://ha.example.com/api/websocket
```

### Composition

The composition root selects exactly one connection mode and constructs exactly one Home Assistant client. Supervisor and standalone credentials must never be mixed or silently substituted.

Observer and operator use the same selected Home Assistant connection, while all existing gateway-side authentication, authorization, capability, approval, idempotency, allowlist, and audit rules remain unchanged.

## Configuration contract

Add an explicit mode:

```env
GATEWAY_HOME_ASSISTANT_MODE=supervisor|standalone
```

Supervisor configuration remains supported:

```env
GATEWAY_HOME_ASSISTANT_MODE=supervisor
SUPERVISOR_TOKEN=...
GATEWAY_SUPERVISOR_URL=http://supervisor/core/api
```

Standalone configuration:

```env
GATEWAY_HOME_ASSISTANT_MODE=standalone
GATEWAY_HOME_ASSISTANT_URL=http://homeassistant:8123
GATEWAY_HOME_ASSISTANT_TOKEN=...
```

Validation must fail closed for:

- unknown mode;
- standalone without URL;
- standalone without token;
- Supervisor without token;
- unsupported URL scheme;
- embedded URL credentials;
- malformed or ambiguous URL paths;
- ambiguous mixed-mode configuration.

The existing implicit Supervisor behavior may be retained only as a deliberate compatibility migration rule, documented and tested. It must not hide partial standalone configuration or create a fallback.

## Health and readiness

Keep liveness separate from readiness:

- `/health`: process liveness;
- `/ready`: validated configuration and bounded upstream readiness;
- upstream status: sanitized Home Assistant reachability state.

Responses may expose mode and reachability, but never tokens, authorization headers, or secret-bearing URLs. Health checks must have bounded timeouts and must not open unbounded WebSocket sessions.

## Standalone Docker deployment

Add:

```text
deploy/standalone/compose.yaml
deploy/standalone/.env.example
deploy/standalone/README.md
```

The Compose deployment must:

- use an immutable image tag in the documented example;
- persist `/data` in a named volume;
- expose port `8099` explicitly;
- use `restart: unless-stopped`;
- support an external Docker network;
- contain no secrets in YAML;
- contain no `privileged`, Docker socket, `cap_add: ALL`, or host networking;
- include a bounded healthcheck;
- make `operator_enabled=false` the default.

The Compose documentation must explain that `localhost` inside the gateway is the gateway container, not Home Assistant. It must show both a shared Compose network and an external Docker network.

Standalone has no Home Assistant Ingress. The documentation must therefore distinguish the MCP endpoint from the administrative UI and recommend private-network binding, VPN, firewall, or a TLS/authenticated reverse proxy before exposing the UI outside the trusted network.

## Test plan

### Unit tests

- configuration mode parsing;
- Supervisor and standalone settings;
- URL normalization;
- REST/WebSocket endpoint resolution;
- HTTP and HTTPS mapping;
- invalid schemes and embedded credentials;
- missing and mixed credentials;
- secret-safe `repr`, errors, traces, and diagnostics.

### Transport tests

- REST state/service/event/config requests in both modes;
- correct Bearer header;
- WebSocket auth handshake in both modes;
- WebSocket command correlation;
- 401/403/404 handling;
- invalid JSON;
- timeout and network errors;
- bounded retry behavior;
- redaction and trace safety.

### Composition and API tests

- Supervisor composition regression;
- standalone composition;
- no connection behavior;
- observer operation through standalone;
- operator remains disabled by default;
- operator approval/execution preserves existing policy;
- `/health`, `/ready`, catalog, MCP initialize, and `tools/list` expose no secrets.

### Docker tests

Use a local fake Home Assistant REST/WebSocket target in CI to verify:

- container startup;
- healthcheck;
- standalone connectivity;
- MCP initialization;
- observer read operation;
- sanitized failure behavior;
- token absence from logs;
- volume persistence.

The repository-level fake transport fixture is:

```text
scripts/fake_home_assistant.py
tests/test_fake_home_assistant_integration.py
```

It validates the real HTTP and WebSocket client boundary with a subprocess-launched FastAPI target and fixture Bearer token. It is intentionally distinct from the authorized real-container smoke test and does not use real Home Assistant credentials.

Validate the Compose manifest with:

```bash
docker compose -f deploy/standalone/compose.yaml config
```

### Real smoke test

Against an authorized Home Assistant Container target:

1. create a dedicated Long-Lived Access Token;
2. create or verify the Docker network;
3. start the gateway with standalone configuration;
4. verify `/health` and `/ready`;
5. initialize MCP;
6. run `tools/list`;
7. run an observer read;
8. stop and restart Home Assistant;
9. verify bounded failure and recovery;
10. verify gateway data persistence;
11. revoke the Home Assistant token and verify failure;
12. create a replacement token and verify recovery;
13. verify no token appears in logs or responses.

The token must never be included in shell history, committed files, reports, or tool output.

## Documentation plan

Add a complete English consumer guide:

```text
docs/consumer/home-assistant-container.md
```

Add a deployment comparison:

```text
docs/deployment-targets.md
```

Update only after implementation evidence exists:

- `README.md`;
- consumer README;
- MCP client configuration;
- troubleshooting;
- Home Assistant platform contracts;
- security model;
- architecture;
- live smoke documentation;
- release documentation.

Documentation must cover installation, networks, Long-Lived Access Tokens, Compose, MCP URL, UI exposure, health/readiness, updates, backup, token rotation, troubleshooting, and Supervisor-versus-Container limitations.

## Docker test-environment discovery

The current execution environment has been checked before implementation:

```text
Docker CLI: available
Docker Compose: v5.3.1 available
Docker daemon: not accessible to the current user
Docker socket: permission denied at unix:///var/run/docker.sock
```

The implementation must not assume Docker access. It must not automatically change group membership, permissions, daemon configuration, or use `sudo`. Docker access must be enabled explicitly by the operator or by the CI runner configuration.

Before the real smoke phase, record:

```bash
id
groups
docker version
docker compose version
docker info
```

If the daemon remains inaccessible, report the blocker and run all non-Docker gates plus the fake-HA tests. Do not claim that a real container smoke test passed.

## Docker test strategy

The proposed real-container test is appropriate, but it must be split into reproducible layers rather than relying only on one manually started stack.

### Layer A — Pure application and transport tests

Run without Docker. Use an in-process fake REST/WebSocket target and deterministic fixtures. These tests run on every pull request and cover endpoint resolution, authentication, errors, redaction, readiness, MCP behavior, and Supervisor regressions.

### Layer B — Gateway image contract tests

Build the gateway image from the checked-out source and run it in an isolated Compose project. Use a fake Home Assistant service in the same Compose network. Verify startup, health, readiness, REST/WebSocket access, MCP initialization, observer reads, failure handling, logs, and persistence.

This layer is suitable for CI because it does not require a real Home Assistant onboarding flow or a real user token.

### Layer C — Real Home Assistant Container smoke

Run a clean, disposable Home Assistant Container and the gateway as separate services. This validates the real Home Assistant REST and WebSocket contracts, Docker DNS, token authentication, startup ordering, and the published gateway artifact.

This layer may require a separately provisioned Long-Lived Access Token because Home Assistant's onboarding and token lifecycle are user-facing. The token must be provided through an ignored local `.env` file or an equivalent secret mechanism and never through repository files, command arguments, logs, CI output, or committed fixtures.

### Layer D — Published-artifact smoke

After a release candidate exists, repeat the real smoke using the immutable GHCR image digest rather than a local build. This proves that the published artifact, not merely the source tree, works in standalone mode.

## Real Home Assistant Container test project

Create a temporary test project outside the repository or under a generated temporary directory that is always removed after the test. Do not commit runtime state, Home Assistant configuration, SQLite data, tokens, or logs.

The project must use:

- a pinned Home Assistant image tag selected at test time;
- a dedicated Compose project name;
- a dedicated bridge network;
- a dedicated gateway data volume;
- a temporary Home Assistant configuration volume;
- a random or isolated host port if a host port is needed;
- a bounded timeout for startup and readiness;
- `docker compose down --volumes --remove-orphans` in cleanup;
- a trap/finalizer that runs cleanup after success, timeout, or failure.

The gateway must address Home Assistant by the Compose service name, never by `localhost`:

```text
GATEWAY_HOME_ASSISTANT_URL=http://homeassistant:8123
```

Use Compose healthchecks and `depends_on: condition: service_healthy` only for startup ordering. Docker Compose does not otherwise wait for an application to become ready merely because its container is running. The gateway must still perform its own bounded readiness check and recovery behavior.

Reference:

- https://docs.docker.com/compose/how-tos/startup-order/
- https://www.home-assistant.io/installation/linux/
- https://github.com/home-assistant/docker

## Real smoke phases

### Phase 1 — Clean Home Assistant startup

1. Pull the explicitly selected Home Assistant image.
2. Create the isolated network, volumes, and Compose project.
3. Start Home Assistant only.
4. Wait for the official container health/readiness signal and the HTTP API.
5. Confirm that the instance is genuinely clean and not reusing prior state.
6. Complete onboarding through the supported test procedure.
7. Create a dedicated Long-Lived Access Token with a documented test identity.
8. Store the token only in the process environment or an ignored temporary secret file.

If onboarding cannot be safely automated, the test harness must stop with an explicit manual checkpoint rather than pretending that the token exists.

### Phase 2 — Gateway standalone startup

1. Build the gateway image or select an immutable published digest.
2. Start the gateway in `standalone` mode.
3. Inject only:
   - `GATEWAY_HOME_ASSISTANT_MODE`;
   - `GATEWAY_HOME_ASSISTANT_URL`;
   - `GATEWAY_HOME_ASSISTANT_TOKEN`;
   - bounded gateway runtime settings.
4. Wait for the gateway liveness endpoint.
5. Wait for gateway readiness against Home Assistant.
6. Capture sanitized container status and logs.
7. Assert that the token does not occur in logs, inspectable responses, or diagnostics.

### Phase 3 — Functional MCP verification

1. Connect to the gateway MCP endpoint.
2. Verify unauthenticated access is rejected.
3. Initialize with an independent MCP client token.
4. Run `tools/list`.
5. Verify the observer tool set.
6. Read `ha_states`, `ha_services`, `ha_events`, and one bounded history/logbook operation where the clean instance supports it.
7. Verify result bounds, status classification, and traces.
8. Confirm that the Home Assistant token and MCP client token remain separate.

### Phase 4 — Failure and recovery

1. Revoke or temporarily invalidate the Home Assistant token.
2. Verify sanitized upstream authentication failure.
3. Stop Home Assistant.
4. Verify bounded readiness failure and no hanging requests.
5. Restart Home Assistant.
6. Verify gateway recovery without recreating gateway state.
7. Recreate the token if needed and verify recovery.
8. Stop and restart the gateway.
9. Verify client database, audit state, and configured behavior persist in `/data`.

### Phase 5 — Security and cleanup

1. Verify operator is disabled by default.
2. Verify no Docker socket or privileged capability is used.
3. Verify the gateway is only reachable through the intended test network/port.
4. Collect only sanitized diagnostics.
5. Tear down the Compose project, volumes, network, and temporary secrets.
6. Assert that no temporary token, Home Assistant state, or container artifact remains in the repository.

## CI versus real-host evidence

The following evidence must be reported separately:

| Evidence | CI/fake target | Real Home Assistant Container |
| --- | ---: | ---: |
| Python/unit tests | required | not a replacement |
| Fake REST/WebSocket container | required | not a replacement |
| Compose syntax/security validation | required | not a replacement |
| Real HA onboarding | not required | required for real support claim |
| Real Long-Lived Token auth | not required | required |
| Published GHCR artifact | optional per PR | required before release claim |
| Docker daemon access | CI runner requirement | host prerequisite |

A successful fake-target test must never be reported as a successful real Home Assistant Container test.

## Docker security prerequisite

The current host has Docker installed but the current user cannot access the daemon. Docker documentation treats daemon access as a security-sensitive capability. Do not solve this by mounting the Docker socket into a container or by silently escalating privileges.

Possible operator-approved solutions are outside the code change:

- grant controlled access through the host's Docker policy;
- use a dedicated CI runner with Docker access;
- use rootless Docker if appropriate for the host;
- run the smoke test on a separate authorized Docker host.

The selected solution must be recorded as environment evidence, not encoded as an application requirement.

## Implementation order

### Block 0 — Baseline

Record branch, clean tree, local and remote SHA, Python suite, ruff, frontend gates, image metadata, and current app-channel checks. Do not edit with a dirty or divergent tree.

### Block 1 — Configuration and endpoint policy

Implement the explicit connection mode, validated settings, endpoint resolver, sanitized errors, and focused tests. Preserve Supervisor behavior.

### Block 2 — Generic Home Assistant infrastructure

Generalize REST/WebSocket infrastructure, update composition, preserve bounded/redacted behavior, and run Supervisor regression tests plus standalone transport tests.

### Block 3 — Executable boundary and readiness

Implement environment loading, startup validation, liveness/readiness semantics, and secret-safe diagnostics.

### Block 4 — Compose deployment

Add standalone Compose, `.env.example`, deployment README, manifest validation, and container startup tests.

### Block 5 — Documentation

Add the Container guide and deployment matrix. Update existing claims only where implementation and tests prove them.

### Block 6 — CI and smoke

Add fake-HA container tests, Compose validation, artifact smoke coverage, and perform the authorized real smoke test.

### Block 7 — Version and release closure

Resolve version metadata separately or explicitly as a release block. Verify image digest, exact SHA, CI, documentation, Compose, stable App, and Edge channel before publishing.

## Quality gates

Every implementation block must pass focused tests before moving on. Final gates must include:

```text
.venv/bin/python -m compileall -q src scripts tests
.venv/bin/python -m pytest
.venv/bin/python -m pytest --cov=homeassistant_gateway --cov-fail-under=85
.venv/bin/ruff check src tests scripts
corepack pnpm --dir frontend install --frozen-lockfile
corepack pnpm --dir frontend run check
corepack pnpm --dir frontend run test:architecture
corepack pnpm --dir frontend run build
python scripts/check_package_manager.py
python scripts/check_app_channels.py
docker compose -f deploy/standalone/compose.yaml config
git diff --check
```

The exact repository CI commands remain authoritative if they differ from this list.

## Acceptance criteria

The feature is complete only when:

- Supervisor/App behavior remains regression-tested and unchanged;
- standalone REST and WebSocket access works;
- configuration is explicit and fail-closed;
- no secret appears in logs, traces, responses, or reports;
- operator remains disabled by default;
- Compose is secure and reproducible;
- fake-target container tests pass;
- an authorized real Home Assistant Container smoke test passes;
- documentation matches the implementation;
- CI passes on the exact pushed SHA;
- published image digest is verified;
- local and remote SHA match;
- the tree is clean.

## Verified execution evidence

The first real Docker validation was executed on the development host with Docker Engine 29.6.2 and Compose v5.3.1.

The Home Assistant Container image was resolved and executed by immutable manifest digest:

```text
ghcr.io/home-assistant/home-assistant@sha256:14931c6b13756317849f46da1d01b45937a1150db66c081cfe529d48215943fe
```

The isolated run used a temporary Docker network and volume, completed the official onboarding flow, exchanged the authorization code, authenticated through the Home Assistant WebSocket API, created a one-day Long-Lived Access Token, and verified `/api/config` through the REST API. The token was generated in memory, written only to a mode-0600 temporary env file, never printed, and removed by cleanup.

The gateway image was built from the pushed source SHA and started on the same temporary Docker network. The observed results were:

```text
clean Home Assistant Container: PASS
gateway container started: PASS
/ready reports Home Assistant ready: PASS
protected gateway health endpoint rejects anonymous request with 401: PASS
Home Assistant token absent from gateway logs: PASS
containers, network, volume, and temporary secret file cleaned: PASS
```

The test also confirmed that `/api/health/details` is intentionally protected by the gateway's existing client authentication. A 401 response without gateway credentials is expected and is not evidence of an upstream failure.

The complete authenticated test must remain a host smoke test unless the repository later adds a dedicated, audited onboarding fixture. CI must use the fake REST/WebSocket target and must never contain a real Home Assistant credential.
