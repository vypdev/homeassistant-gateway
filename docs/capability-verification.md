# Capability verification

The Clients view exposes a safe capability probe for each registered client. It is an Ingress-only management operation and does not use the client's bearer token or execute MCP mutations.

## Architecture

The flow follows the repository's Clean Architecture boundaries:

```text
Clients view
  -> GatewayController / GatewayPort
  -> Gateway API adapter: POST /api/clients/{client_id}/capability-probe
  -> presentation route
  -> ProbeCapabilities application use case
  -> AuthorizeRequest + HomeAssistantReadPort
```

`ProbeCapabilities` owns the verification policy. FastAPI only translates the request and response. The Home Assistant adapter remains behind `HomeAssistantReadPort`, so tests do not need a live HA instance.

## Result semantics

Each catalog entry produces one bounded result:

- `ok`: the client has the read capability and the corresponding read adapter succeeded.
- `denied`: the client does not have the required capability; no upstream read is attempted.
- `approval_required`: an implemented operator capability was recognized, but the probe deliberately stops before requesting or executing a mutation.
- `unsupported`: the capability is known but no MCP tool is registered yet.
- `error`: authorization succeeded but the bounded upstream read failed. The result contains only a sanitized reason, path, HTTP status and parameter names.

The response contains counts, shapes, keys and an optional sample entity ID. It never returns credentials, bearer tokens, raw request bodies or complete upstream payloads.

## Capability/tool matrix

| Capability | Tool | Probe behavior |
| --- | --- | --- |
| `ha.read.automations` | `ha_automations` | Performs a bounded automation inventory read |
| `ha.read.automation_config` | `ha_automation_config` | Selects the first automation when no entity is provided and performs the sanitized configuration read |
| `ha.read.config_entries` | `ha_configuration` | Reads processed configuration metadata, not the source YAML file |
| `ha.read.registry` | bounded registry read | Reads the devices resource as a representative probe |
| `ha.write.services` | approval tools | Returns `approval_required`; no service call is made |
| `ha.write.automations` | approval tools | Returns `approval_required`; no automation action is made |
| `ha.write.configuration` | none | Returns `unsupported`; this capability is disabled in the selector until a real tool exists |

## YAML boundary

`ha_automation_config` can retrieve a sanitized automation configuration through Home Assistant's supported configuration endpoint. `ha_configuration` returns processed configuration and registry metadata. It does **not** imply access to `/config/configuration.yaml` or any arbitrary container file.

The gateway must not add arbitrary filesystem access merely to obtain source YAML. A future source-YAML feature would require an explicit Home Assistant-native contract, a separate capability, bounded paths, redaction and independent security review.

## Testing commands

From `frontend/`:

```bash
corepack pnpm run check
corepack pnpm run test:runtime
corepack pnpm run test:ux
corepack pnpm run build
corepack pnpm exec playwright test e2e/gateway.spec.ts --project=chromium
```

From the repository root:

```bash
.venv/bin/python -m pytest tests/test_capability_probe.py tests/test_http_api.py -q
```

The application tests verify granted reads, denied reads without an upstream call, unsupported configuration writes and approval-only mutation probes. The browser test verifies the desktop/mobile-compatible client action and that the result table does not create horizontal viewport overflow.
