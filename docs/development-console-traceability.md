# Development Console: read traceability

## Purpose

The Development Console verifies gateway read operations and helps locate whether a successful, empty, warning or error result originated in the application, transport or Home Assistant. Traceability is diagnostic and read-only: it does not enable write operations or expand MCP capabilities.

## Result contract

Each development result may include:

```json
{
  "status": "ok | warning | error",
  "operation": "entity_registry",
  "duration_ms": 12,
  "count": 42,
  "reason": null,
  "details": null,
  "trace": [
    {
      "phase": "execute",
      "transport": "application",
      "status": "ok",
      "duration_ms": 12,
      "command": "entity_registry",
      "path": null,
      "attempt": 1,
      "code": null,
      "detail": "operation_completed"
    }
  ]
}
```

### Fields

- `status`: semantic operation result.
  - `ok`: valid read with data.
  - `warning`: valid but empty or partial read.
  - `error`: the read could not be completed.
- `count`: number of items normalized by the application.
- `reason`: stable reason localized by the interface (`empty_result`, upstream error, invalid parameter, and so on).
- `details`: structured, sanitized technical information. It may include a code, HTTP status, logical path and parameter names, but never sensitive parameter values.
- `trace`: ordered operation steps.
  - `phase`: phase (`connect`, `auth`, `command`, `normalize`, `fallback`, `error`, `execute`).
  - `transport`: channel (`websocket`, `rest`, `template`, `application`, `upstream`).
  - `command`: logical Home Assistant command, never a complete frame.
  - `path`: logical path without query values or tokens.
  - `attempt`: bounded attempt number.
  - `code`: sanitized stable code.
  - `detail`: stable technical explanation, never a raw exception.

The current phase uses WebSocket as the primary transport for:

- `config/device_registry/list`;
- `config/area_registry/list`;
- `config/floor_registry/list`;
- `config/label_registry/list`;
- `config/entity_registry/list`;
- `get_config`;
- `history/history_during_period`;
- `logbook/get`.

`states`, `services`, `events` and health checks retain REST in this first phase. The migration is not considered complete until equivalent contracts cover them.

## Interface

The console shows:

- a count of problematic results (`error` + `warning`);
- a button to copy only those incidents;
- an individual copy button for each problematic result;
- an expandable traceability panel per operation;
- duration, attempts, transport, command, path and technical code;
- structured details when an error exists;
- a complete result export through general diagnostics.

Copying incidents does not re-run the operation. It uses only already collected results and excludes successful operations.

## Security and privacy

The following must never enter the trace, export or clipboard:

- `SUPERVISOR_TOKEN` or MCP tokens;
- passwords, cookies, keys or credentials;
- complete WebSocket frames;
- complete error response bodies;
- sensitive filter values;
- dynamic query strings;
- states or attributes not required to explain the error.

Tests must demonstrate that errors and copied diagnostics contain only allowlisted fields.

## Verification

Relevant local gates:

```bash
.venv/bin/pytest tests/test_development.py tests/test_http_api.py -q
python scripts/check_frontend_i18n.py
python scripts/check_frontend_i18n_runtime.py
cd frontend
npm run test:runtime
npm run test:ux
npm run check
npm run build
```

The UX contract test verifies that the console preserves the separation between successful results, warnings and errors and renders traceability. The i18n validation checks all 11 locales and runtime catalog resolution.

## WebSocket migration

During migration to `ws://supervisor/core/websocket`, the expected phases are:

```text
connect → auth → command → normalize
```

If transport fails and policy permits fallback:

```text
connect → auth/command(error) → fallback(rest|template) → normalize
```

A correctly authenticated empty WebSocket result must not automatically trigger fallback. An authentication failure must never be presented as `empty_result`. The console must distinguish both cases.
