# Live smoke verification

`tests/` and CI use deterministic Supervisor contract fakes. This script adds a separate live evidence level without storing credentials:

```bash
GATEWAY_LIVE_URL='https://<supervisor-ingress-url>' \
GATEWAY_INGRESS_USER_ID='<your-ingress-user-id>' \
.venv/bin/python scripts/live_smoke.py
```

It verifies `/health`, `/ready`, `/api/ui/context`, `/api/development/catalog`, and `/api/health/details`. The protected API checks are skipped when `GATEWAY_INGRESS_USER_ID` is absent.

For an MCP boundary check, provide the MCP URL and token through the local environment only:

```bash
GATEWAY_LIVE_URL='https://<gateway-url>' \
GATEWAY_MCP_URL='https://<mcp-url>/' \
GATEWAY_MCP_TOKEN='[local secret, never commit]' \
.venv/bin/python scripts/live_smoke.py
```

The script never prints response bodies, headers, tokens, query values, or exception text. It returns zero when required checks pass, and returns `SKIP` rather than pretending a live check happened when no URL is configured.

## Evidence levels

- **Contract:** deterministic HTTPX adapter and ASGI tests in CI.
- **Artifact:** published App image and multi-architecture manifest.
- **Live:** this script against the installed Supervisor App. Live success must be reported separately from CI success.

A disposable Home Assistant environment can use the same script after exposing its Supervisor Ingress URL. No Docker socket, shell access, or write capability is required by the gateway.
