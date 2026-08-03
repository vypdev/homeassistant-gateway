# Home Assistant Gateway

[![CI](https://github.com/vypdev/homeassistant-gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/vypdev/homeassistant-gateway/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/vypdev/homeassistant-gateway?sort=semver)](https://github.com/vypdev/homeassistant-gateway/releases)

**Home Assistant Gateway** is a Home Assistant add-on that provides a secure, bounded and auditable MCP interface for clients such as Hermes and OpenClaw to query a Home Assistant installation.

The default surface is **observer/read-only**: inventory, states, registries, history, logbook, diagnostics and metadata. Administration is served through Home Assistant Ingress, while direct MCP transport is protected by a host allowlist, Bearer token, client identity and capabilities.

> **Current status:** `v0.5.10`. Operator remains disabled: **No operator mutation is enabled yet**. No MCP write tools are registered.

## How to use it

### 1. Install the add-on

1. Add this repository to the Home Assistant add-on store.
2. Install **Home Assistant Gateway**.
3. Open the interface through **Open Web UI**; the administration console is protected by Supervisor Ingress.
4. Keep `operator_enabled: false` unless an explicitly provisioned write capability is introduced in the future.

### 2. Create an observer client

From the Ingress console:

1. open **Clients**;
2. create an independent client for each agent;
3. select the `observer` profile;
4. grant only the required capabilities;
5. save the token when it is shown: it cannot be retrieved later.

Tokens are independent per client. For a lost or exposed token, use **Rotate** or **Revoke**.

### 3. Connect an MCP client

Configure `mcp_allowed_hosts` with the destination hosts used in the URL, without a port and without a global `*`. For example:

```text
localhost,127.0.0.1,[::1],homeassistant,homeassistant.local
```

Use the port published by the add-on and the `/mcp/` path:

```text
http://<home-assistant-host>:18099/mcp/
```

The client must send its token as:

```http
Authorization: Bearer <observer-client-token>
```

The minimum verification sequence is:

1. `/mcp/` without a token → expected `401`;
2. authenticated `initialize` → success;
3. `tools/list` → only the tools authorized for that client;
4. one read operation → sanitized `ok`, `warning` or `error` result.

The direct MCP endpoint does not publish the administration console. Use the Development Console through Ingress to verify connectivity, empty results, failures and read traceability.

## What it exposes

The observer profile can expose the following read-only tools, depending on the client's capabilities:

```text
gateway_diagnostics  ha_inventory       ha_states
ha_automations       ha_automation_config ha_configuration
ha_history           ha_logbook           ha_services
ha_events             ha_devices           ha_areas
ha_floors             ha_labels            ha_entity_registry
ha_scripts            ha_scenes            ha_helpers
ha_integrations
```

The effective list is always verified with `tools/list`; connectivity does not prove that a client has every permission.

## Security and boundaries

- Home Assistant services are not called, and automations or configuration are not modified.
- The gateway does not provide arbitrary shell, Docker socket, SSH, network scanning or transparent API proxying.
- Secrets are excluded from prompts, MCP results, logs, audit records, snapshots and Git.
- Results are bounded and distinguish successful reads, empty collections (`warning`/`empty_result`) and upstream or transport failures.
- Development Console jobs are process-local, bounded and non-durable; they are lost when the add-on restarts.

## Documentation index

### Consumer guides

- [Consumer guide](docs/consumer/README.md) — installation, surfaces, tools and minimum verification.
- [Configure an MCP client](docs/consumer/configure-mcp-client.md) — endpoint, tokens, capabilities, rotation and revocation.
- [Troubleshooting](docs/consumer/troubleshooting.md) — symptoms, causes and checks.
- [OpenClaw and Hermes integration](docs/integration-with-openclaw-and-hermes.md) — agent profiles and connectivity.

### Product and architecture

- [Architecture](docs/architecture.md) — Clean Architecture boundaries, ports, adapters and composition.
- [Security model](docs/security-model.md) — threats, profiles, credentials, network and auditing.
- [Home Assistant platform contracts](docs/home-assistant-platform-contracts.md) — APIs, WebSocket, Supervisor and Ingress.
- [Frontend design](docs/frontend-design.md) — shell, Ingress, accessibility, themes and i18n.

### Development Console and operations

- [Development Console](docs/development-console.md) — operations, packs, jobs and results.
- [Automation inspection](docs/automation-analysis.md) — bounded YAML rendering, static findings and read-only analysis.
- [Development Console traceability](docs/development-console-traceability.md) — evidence, failures, warnings, comparisons and export.
- [Frontend and credentials](docs/frontend-and-credentials.md) — UI boundaries and token handling.
- [Live smoke](docs/live-smoke.md) — verification against an authorized target.

### Planning and releases

- [Roadmap](docs/roadmap.md) — planned evolution and current boundaries.
- [Release 0.5.0](docs/release-0.5.0.md) — historical architecture-hardening checklist.
- [ADR: Home Assistant as the primary target](docs/adr/0001-home-assistant-native.md) — product and deployment decision.

## Local development

```bash
python -m pytest
.venv/bin/ruff check src tests scripts
npm --prefix frontend run check
npm --prefix frontend run build
```

Read the architecture and consumer guides before changing MCP contracts, profiles or security boundaries.

## License

MIT. See [`LICENSE`](LICENSE).
