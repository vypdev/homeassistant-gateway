# Deployment targets

Home Assistant Gateway uses one application core with two explicit deployment targets. The target changes how the gateway reaches Home Assistant; it does not create a second MCP product or duplicate gateway policies.

## Comparison

| Concern | Home Assistant OS/Supervised | Home Assistant Container |
| --- | --- | --- |
| Home Assistant API | Supervisor API and Supervisor WebSocket path | Core REST API and Core WebSocket API |
| Gateway packaging | Home Assistant app/add-on | Independent Docker container or Compose |
| Ingress | Available through Supervisor | Not available |
| Credential | `SUPERVISOR_TOKEN` | Home Assistant Long-Lived Access Token |
| Gateway mode | `GATEWAY_HOME_ASSISTANT_MODE=supervisor` | `GATEWAY_HOME_ASSISTANT_MODE=standalone` |
| Home Assistant URL | Supervisor URL, normally `http://supervisor/core/api` | Core URL, for example `http://homeassistant:8123` |
| Default operator access | Disabled by policy | Disabled by policy |
| Persistent gateway data | `/data` in the app environment | `/data` in the gateway Docker volume |

## Shared behavior

Both targets use the same domain and application policies:

- gateway client authentication;
- observer and operator profiles;
- capability allowlists;
- approval and idempotency controls;
- audit records;
- bounded REST/WebSocket transport behavior;
- health, readiness, and sanitized diagnostics;
- token redaction from logs, traces, responses, and errors.

The application layer does not import Docker, Supervisor, HTTP clients, WebSocket clients, or process configuration. The composition root selects exactly one validated connection mode.

## Choosing a target

Choose **OS/Supervised** when the gateway should be managed as a Home Assistant app and exposed through Home Assistant Ingress.

Choose **Container** when Home Assistant is deployed with Docker without Supervisor, or when the gateway must be operated as an independent service. In this mode, the operator is responsible for Docker networking, private exposure of the gateway endpoints, image updates, backups, and token rotation.

## Important limitations of Container mode

Container mode does not provide:

- Supervisor APIs;
- Home Assistant Ingress;
- add-on lifecycle management;
- `SUPERVISOR_TOKEN`;
- Supervisor-only services.

The gateway must call Home Assistant Core directly. Use the Home Assistant service DNS name or an intentionally configured routed address; `localhost` from inside the gateway container is not the Home Assistant host.

## Security model

The Home Assistant token and gateway MCP client tokens are different credentials with different trust boundaries:

- the Home Assistant token is held by the gateway infrastructure adapter and is used only for upstream API calls;
- gateway client tokens authenticate callers to the gateway;
- neither token is returned by health, readiness, MCP, diagnostics, audit, or UI endpoints.

Standalone deployment has no implicit trusted ingress boundary. Bind the host port privately or put the gateway behind a VPN, firewall, or TLS/authenticated reverse proxy.

## Verification matrix

Before a release is considered ready for a target, verify:

- configuration validation and endpoint normalization;
- REST and WebSocket authentication;
- readiness and bounded upstream failure;
- MCP initialization and observer reads;
- persistence across gateway restart;
- secret-safe logs and diagnostics;
- Supervisor regression tests for the Supervisor target;
- fake REST/WebSocket integration tests in CI;
- disposable real Home Assistant Container smoke for standalone;
- published-image smoke against the immutable artifact when a release image exists.

See [Home Assistant Container deployment](consumer/home-assistant-container.md) for the independent Docker procedure.
