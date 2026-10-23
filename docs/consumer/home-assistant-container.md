# Home Assistant Container deployment

This guide deploys Home Assistant Gateway as an independent Docker container next to Home Assistant Container. It uses Home Assistant Core's REST and WebSocket APIs directly; it does not require Supervisor, Ingress, or add-ons.

## When to use this deployment

Use this target when Home Assistant runs as the official Container installation or another deployment that exposes the Core API directly.

| Target | Home Assistant API | Gateway integration |
| --- | --- | --- |
| Home Assistant OS/Supervised | Supervisor API | App/add-on with Ingress |
| Home Assistant Container | Core REST and WebSocket APIs | Independent Docker container or Compose project |

The application core and gateway-side authorization policies are shared. Only the Home Assistant connection adapter and deployment boundary differ.

## Prerequisites

- Docker Engine and Docker Compose;
- a reachable Home Assistant Container instance;
- a Home Assistant Long-Lived Access Token;
- a private Docker network or a deliberately protected routed connection;
- an immutable gateway image tag or digest.

A Home Assistant token is not a gateway MCP client token. Keep them separate and never expose the Home Assistant token to MCP clients.

## Quick start

Create a private deployment directory and copy the example configuration:

```bash
mkdir -p ~/homeassistant-gateway-standalone
cd ~/homeassistant-gateway-standalone
curl -fsSLO https://raw.githubusercontent.com/vypdev/homeassistant-gateway/master/deploy/standalone/compose.yaml
curl -fsSLO https://raw.githubusercontent.com/vypdev/homeassistant-gateway/master/deploy/standalone/.env.example
cp .env.example .env
chmod 600 .env
```

Set these values in `.env` without committing or printing the file:

```env
GATEWAY_IMAGE=ghcr.io/vypdev/homeassistant-gateway:0.5.35
GATEWAY_HOME_ASSISTANT_URL=http://homeassistant:8123
GATEWAY_HOME_ASSISTANT_TOKEN=<long-lived-access-token>
GATEWAY_HOST_PORT=8099
```

Use the Home Assistant service name or DNS name reachable from the gateway container. `localhost` inside the gateway container refers to the gateway itself.

Validate and start:

```bash
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
curl --fail http://127.0.0.1:8099/health
curl --fail http://127.0.0.1:8099/ready
```

`/health` confirms process liveness. `/ready` also checks the configured Home Assistant upstream with bounded timeouts. Neither endpoint returns a token.

## MCP and administrative access

Standalone deployment has no Home Assistant Ingress. The current Compose file binds the gateway only to host loopback. For remote administrative access, including from the LAN, keep this binding and use a TLS/authenticated reverse proxy. Authenticate UI and `/api/*` requests, strip caller-supplied `X-Remote-User-ID` headers, and derive that identity from the authenticated proxy session. A caller-supplied identity header is not a credential. MCP still requires its separate gateway bearer tokens and capability policy.

Use a separately issued gateway client token for MCP authentication. Do not use the Home Assistant token as a gateway client credential.

## Networking

For services in the same Compose project, use the service name:

```env
GATEWAY_HOME_ASSISTANT_URL=http://homeassistant:8123
```

For services in different Compose projects, create and share an external network:

```bash
docker network create homeassistant-backend
```

Attach the Home Assistant and gateway services to that network in their respective Compose files, then use the DNS name registered on that network. Do not assume that a host-published port or `localhost` is reachable from a container.

## Persistence, backup, and restore

The gateway stores client, audit, and development report state in the Compose-managed `gateway-data` volume. Its actual Docker name includes the Compose project name unless explicitly overridden. Use the existing service container's mounts so the backup targets the correct volume without creating an unrelated empty one.

Run this from the same deployment directory and with the same Compose project settings used to start the gateway. The subshell stops the gateway for a consistent archive and restarts it on exit only if it was running beforehand:

```bash
(
  set -eu
  umask 077
  container_id="$(docker compose -f compose.yaml ps --all --quiet homeassistant-gateway)"
  [ -n "$container_id" ] || { echo 'Create the gateway service before backing it up.' >&2; exit 1; }
  was_running="$(docker inspect --format '{{.State.Running}}' "$container_id")"
  backup_dir="$(mktemp -d "$HOME/homeassistant-gateway-backup.XXXXXX")"
  trap 'if [ "$was_running" = true ]; then docker compose -f compose.yaml start homeassistant-gateway; fi' EXIT
  docker compose -f compose.yaml stop homeassistant-gateway
  docker run --rm --network none \
    --volumes-from "$container_id:ro" \
    alpine:3.22 \
    tar czf - -C /data . > "$backup_dir/gateway-data.tar.gz.partial"
  tar tzf "$backup_dir/gateway-data.tar.gz.partial" >/dev/null
  mv "$backup_dir/gateway-data.tar.gz.partial" "$backup_dir/gateway-data.tar.gz"
  printf 'Backup saved: %s\n' "$backup_dir/gateway-data.tar.gz"
)
```

The backup directory is private (0700), and the archive is created with private permissions (0600), outside the repository. A failed archive keeps the `.partial` suffix and is not reported as successful. Confirm the archive contains the expected gateway state, then copy it to your protected backup storage. Restore only after stopping the gateway and verifying the archive source and destination. Do not overwrite an existing volume without a backup and an explicit recovery decision.

## Updates and rollback

Use an immutable version or digest. Before updating:

1. back up `gateway-data`;
2. record the current image reference;
3. validate the new Compose configuration;
4. pull the new image;
5. recreate the gateway;
6. verify `/health`, `/ready`, and a read-only MCP operation.

```bash
docker compose -f compose.yaml pull homeassistant-gateway
docker compose -f compose.yaml up -d --force-recreate homeassistant-gateway
curl --fail http://127.0.0.1:8099/ready
```

For rollback, restore the previous immutable `GATEWAY_IMAGE` reference and recreate the container. Preserve the data volume unless the release explicitly requires a documented migration. If a migration is not backward-compatible, restore the volume backup made before the update.

## Token rotation

1. Create a replacement Long-Lived Access Token in Home Assistant.
2. Update the private `.env` file.
3. Recreate the gateway with `docker compose up -d --force-recreate`.
4. Verify `/ready` and a read-only MCP operation.
5. Revoke the old Home Assistant token.

Never include either token in logs, screenshots, shell history, commits, issue reports, or support messages.

## Security boundaries

The Compose contract intentionally excludes privileged mode, Docker socket mounts, host networking, broad Linux capabilities, and automatic operator enablement. Operator capabilities remain disabled by default and retain the gateway's existing profile, capability, approval, idempotency, and audit controls.

## Verification and troubleshooting

Check the resolved configuration without displaying the private `.env` file:

```bash
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=100 homeassistant-gateway
```

Common causes of a failed readiness check:

- the Home Assistant hostname is not resolvable from the gateway network;
- `localhost` was used instead of the Home Assistant service name;
- the Core API URL or token is wrong;
- Home Assistant is still starting;
- a firewall blocks the container-to-container route.

The repository also contains a disposable real smoke harness. It creates a clean Home Assistant Container, validates onboarding and authenticated REST/WebSocket access, starts a gateway image, scans logs for secrets, and removes temporary resources:

```bash
GATEWAY_SMOKE_IMAGE=homeassistant-gateway:standalone-<sha> \
  python scripts/standalone_real_smoke.py
```

The published-artifact variant must use an immutable GHCR digest and should be run only in an isolated operator-controlled environment.
