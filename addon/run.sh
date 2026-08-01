#!/usr/bin/env bash
set -euo pipefail

if [[ -f /data/options.json ]]; then
    export GATEWAY_OPERATOR_ENABLED="$(python -c 'import json, pathlib; print(str(json.loads(pathlib.Path("/data/options.json").read_text()).get("operator_enabled", False)).lower())')"
    export GATEWAY_DEVELOPMENT_CONSOLE_ENABLED="$(python -c 'import json, pathlib; print(str(json.loads(pathlib.Path("/data/options.json").read_text()).get("development_console_enabled", True)).lower())')"
fi

exec homeassistant-gateway
