# Home Assistant Gateway — consumer guide

Home Assistant Gateway is a Home Assistant Supervisor add-on that exposes a **read-only** MCP surface for clients such as Hermes and OpenClaw.

Web administration remains behind **Supervisor Ingress**. MCP transport can be exposed directly over HTTP through `/mcp/`, always protected by a Bearer token and `mcp_allowed_hosts`.

## What it allows

- query bounded inventory, states, registries, history and diagnostics;
- discover the authorized MCP tools for the `observer` profile;
- verify connectivity from the Development Console;
- review partial results, empty collections and historical reports;
- maintain independent tokens per client.

## What it does not allow

- call Home Assistant services;
- modify automations or configuration;
- run shell commands, access the Docker socket, use SSH or scan the network;
- use one client's token to access another client;
- retrieve stored tokens: they are shown only during issuance or rotation.

## Quick installation

1. Add the App repository in Home Assistant.
2. Install **Home Assistant Gateway** from Supervisor.
3. Configure the MCP port and restart the App.
4. Configure `mcp_allowed_hosts` with the destinations used by clients, without a global `*`.
5. Create an independent client with the `observer` profile and minimum capabilities.
6. Configure the MCP client with the `/mcp/` URL and its Bearer token.

## Ingress versus direct MCP

| Surface | Use | Protection |
|---|---|---|
| Supervisor Ingress | UI, administration and `/api/*` APIs | Supervisor Ingress identity |
| Direct `/mcp/` | MCP transport for agents | allowed `Host` + Bearer + client policy |

The direct MCP port does not publish the administration console. A `401` response from `/mcp/` without a token is expected and confirms that authentication is active.

## Observer profile and tools

The `observer` profile is read-only and can expose up to these 18 tools, depending on the client's capabilities:

```text
gateway_diagnostics
ha_inventory
ha_states
ha_automations
ha_configuration
ha_history
ha_logbook
ha_devices
ha_areas
ha_floors
ha_labels
ha_entity_registry
ha_scripts
ha_scenes
ha_helpers
ha_integrations
ha_services
ha_events
```

The effective list must be verified with `tools/list`; model connectivity does not prove permissions.

## Result behavior

- `ok`: successful read, including zero items when the resource does not use `empty_result` semantics.
- `warning` with `reason="empty_result"`: valid query that found no items.
- `error`: transport, upstream, format or authorization failure.
- Development Console jobs: process-local, bounded and non-durable; they disappear when the App restarts.

## Minimum verification

1. `GET /mcp/` without a token → expected `401`.
2. Authenticated MCP `initialize` → `200`.
3. `tools/list` → tools authorized for that client.
4. Ingress UI → `/health` and the console available inside Supervisor.

See also:

- [Configure an MCP client](configure-mcp-client.md)
- [Troubleshooting](troubleshooting.md)
- [Security model](../security-model.md)
- [Architecture](../architecture.md)
