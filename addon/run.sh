#!/usr/bin/env bash
set -euo pipefail

if [[ -f /data/options.json ]]; then
    export GATEWAY_OPERATOR_ENABLED="$(python -c 'import json, pathlib; print(str(json.loads(pathlib.Path("/data/options.json").read_text()).get("operator_enabled", False)).lower())')"
    export GATEWAY_DEVELOPMENT_CONSOLE_ENABLED="$(python -c 'import json, pathlib; print(str(json.loads(pathlib.Path("/data/options.json").read_text()).get("development_console_enabled", True)).lower())')"
    export GATEWAY_MCP_ALLOWED_HOSTS="$(python -c 'import json, pathlib; print(json.loads(pathlib.Path("/data/options.json").read_text()).get("mcp_allowed_hosts", ""))')"
    export GATEWAY_OPERATOR_ALLOWED_SERVICES="$(python -c 'import json, pathlib; print(json.loads(pathlib.Path("/data/options.json").read_text()).get("operator_allowed_services", ""))')"
fi

exec homeassistant-gateway
