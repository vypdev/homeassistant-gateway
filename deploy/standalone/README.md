# Home Assistant Container deployment

This deployment runs Home Assistant Gateway as an independent Docker container and connects to Home Assistant Core through its REST and WebSocket APIs. It does not use Supervisor, Ingress, add-ons, or a Supervisor token.

## Requirements

- Docker Engine and Docker Compose;
- a Home Assistant Container instance reachable from the gateway container;
- a Home Assistant Long-Lived Access Token;
- a Docker network that can resolve the Home Assistant service name;
- an immutable gateway image tag or digest.

A Home Assistant token is different from a gateway MCP client token. The former is used by the gateway to call Home Assistant; the latter authenticates clients to the gateway.

## Configuration

Copy the example file to `.env` in a private deployment directory. Do not commit `.env` or paste the token into a shell command that may be retained in history.

```bash
cp .env.example .env
chmod 600 .env
```

Set at least:

```env
GATEWAY_IMAGE=ghcr.io/vypdev/homeassistant-gateway:0.5.34
GATEWAY_HOME_ASSISTANT_URL=http://homeassistant:8123
GATEWAY_HOME_ASSISTANT_TOKEN=<long-lived-access-token>
GATEWAY_HOST_PORT=8099
```

The hostname in `GATEWAY_HOME_ASSISTANT_URL` must be resolvable from the gateway container. `localhost` means the gateway container itself and is not the Home Assistant container.

## Start

Validate the resolved Compose configuration first:

```bash
docker compose -f compose.yaml config
```

Start the gateway:

```bash
docker compose -f compose.yaml up -d
```

Check status and logs without printing the `.env` file:

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100 homeassistant-gateway
```

Check liveness and readiness from the Docker host:

```bash
curl --fail http://127.0.0.1:8099/health
curl --fail http://127.0.0.1:8099/ready
```

`/health` confirms that the gateway process is alive. `/ready` also reports whether the configured Home Assistant upstream is available. Neither endpoint returns the Home Assistant token.

## Docker networking

If Home Assistant is another service in the same Compose project, use its service name:

```env
GATEWAY_HOME_ASSISTANT_URL=http://homeassistant:8123
```

If Home Assistant belongs to another Compose project, attach both projects to a pre-created external network and use the DNS name available on that network. Do not use the host's published port from inside the container unless that is deliberately required by the host network design.

## Security

Standalone mode does not provide Home Assistant Ingress. Protect the gateway administrative UI and MCP endpoint with a private network, VPN, firewall, or an appropriately configured TLS/authenticated reverse proxy before exposing it beyond a trusted LAN.

The Compose file intentionally does not use:

- privileged mode;
- Docker socket mounts;
- host networking;
- broad Linux capabilities;
- automatic operator enablement.

Operator capabilities remain disabled by default. Enabling them requires the gateway's existing client profile, capability, allowlist, approval, idempotency, and audit policies.

## Real smoke test

The repository includes a host-only smoke test that creates a clean Home Assistant Container, performs onboarding, creates an ephemeral Long-Lived Access Token, starts the gateway, verifies readiness and security, and removes every temporary resource:

```bash
GATEWAY_SMOKE_IMAGE=homeassistant-gateway:standalone-<sha> \
  python scripts/standalone_real_smoke.py
```

Run it from a session with Docker socket access. The script uses an immutable Home Assistant image digest by default; set `HOME_ASSISTANT_IMAGE` explicitly when validating another approved digest. It is intentionally not a CI test: CI must use a fake REST/WebSocket target and must never receive a real Home Assistant credential.

## Stop and remove

Stop the gateway while preserving its data volume:

```bash
docker compose -f compose.yaml down
```

Remove the gateway container and its named data volume only when intentionally deleting client, audit, and report state:

```bash
docker compose -f compose.yaml down --volumes --remove-orphans
```

## Token rotation

1. Create a replacement Long-Lived Access Token in Home Assistant.
2. Update the private `.env` file.
3. Recreate the gateway container:

```bash
docker compose -f compose.yaml up -d --force-recreate
```

4. Verify `/ready` and a read-only MCP operation.
5. Revoke the old token in Home Assistant.

Never include either token in issue reports, logs, screenshots, commits, or support messages.
