# Home Assistant App

This directory is the Supervisor App packaging boundary for `homeassistant-gateway`.

The App now provides:

- a multi-stage Python image build;
- automatic startup with Home Assistant;
- persistent private storage at `/data`;
- liveness through `GET /health` and a container healthcheck;
- management UI/API access through Supervisor Ingress only;
- authenticated Streamable HTTP MCP at `/mcp/`.

The Dockerfile pins the source with `GATEWAY_REF` at build time. Release builds must use an immutable Git ref rather than the mutable default `main`.

The App publishes MCP on host port `18099` and exposes the management UI/API through Supervisor Ingress. `homeassistant_api` and `hassio_api` are enabled for the future structured Home Assistant adapters; Docker socket, SSH, raw shell, and unrestricted `/config` access remain intentionally absent.

A development variant is available in `addon-edge/`. Its published image is built from `main`, uses port `18100`, and keeps its data and credentials isolated from Stable. See `docs/release-channels.md`.

Operator capabilities remain disabled by default. Setting `operator_enabled` is not sufficient by itself: every operator client also needs an explicit capability and service grant, and every mutation requires validation, approval, idempotency and audit controls.
