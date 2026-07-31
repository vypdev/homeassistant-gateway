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

The App does not publish a direct host port. `homeassistant_api` and `hassio_api` are enabled for the future structured Home Assistant adapters; Docker socket, SSH, raw shell, and unrestricted `/config` access remain intentionally absent.

Operator capabilities remain disabled by default. Setting `operator_enabled` is not sufficient to make a mutation safe; operator tools are not implemented until validation, approval, idempotency, audit, and rollback contracts exist.
