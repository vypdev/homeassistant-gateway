#!/usr/bin/env bash
set -euo pipefail
cd /workspace/frontend

pnpm run test:tooling
pnpm run test:runtime
pnpm run test:architecture
pnpm run test:ux
pnpm run check
pnpm run check:storybook
pnpm run storybook:build
pnpm run test:storybook --workers=2
pnpm run build
pnpm run test:e2e --workers=2

preview_log="$(mktemp)"
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 > "$preview_log" 2>&1 &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true; rm -f "$preview_log"' EXIT
preview_ready=false
for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 2 http://127.0.0.1:4174/ >/dev/null; then
    preview_ready=true
    break
  fi
  sleep 1
done
if [ "$preview_ready" != true ]; then cat "$preview_log"; exit 1; fi
PW_BASE_URL=http://127.0.0.1:4174 pnpm run test:e2e --workers=2
