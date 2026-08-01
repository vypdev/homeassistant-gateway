# Development Console

The Development Console is an Ingress-protected, observer-only verification surface. It uses the same `HomeAssistantReadPort` and Supervisor adapter as the MCP observer. It does not proxy arbitrary Home Assistant routes and it cannot execute mutations.

## Endpoints

- `GET /api/development/catalog` — bounded operation and pack catalog.
- `POST /api/development/run` — execute one operation, a pack (`pack:<name>`), or `all`.
- `GET /api/development/reports` — sanitized persisted reports.
- `GET /api/health/details` — independent upstream checks.
- `GET /api/ui/context` — locale/theme compatibility context.
- `POST /api/operator/preview` — validation/diff preview only; execution remains disabled.

The adapter follows Home Assistant's current REST contract: history starts at `/history/period/<timestamp>` with `filter_entity_id`, and logbook starts at `/logbook/<timestamp>` with `entity`; `end_time` remains a query parameter. When an unfiltered probe is requested, the adapter selects one real entity from the bounded states inventory so the reachability check remains valid without pretending that the REST history endpoint supports an unrestricted query.

The MCP discovery contract advertises the same observer surface: `gateway_diagnostics`, inventory, states, automations, configuration, services, events, history, logbook, devices, areas, floors, labels, entity registry, scripts, scenes, helpers and integrations. The MCP functions call the same application read port rather than duplicating upstream HTTP logic.

All management endpoints require the Supervisor Ingress identity. `/health` and `/ready` remain safe health endpoints.

## Upstream health contract

`GET /api/health/details` returns a bounded object:

```json
{
  "status": "ready|degraded|unavailable",
  "checks": [
    {
      "name": "core|states|services|events|recorder|logbook",
      "status": "ok|error",
      "latency_ms": 12,
      "http_status": 200,
      "code": null
    }
  ]
}
```

`recorder` probes `/history/period` with a bounded one-hour start window. `logbook` probes `/logbook` with the same type of window. Errors contain a safe code, never authorization headers, response bodies, cookies, tokens, or query values.

## Run-all and diagnostics

Run-all preserves one result per catalog operation. A failed result includes the operation, status, count, duration and a sanitized reason. The UI provides:

- individual execution;
- retry for the failed operation;
- copy of the sanitized operation/status/reason diagnostic;
- JSON export containing health, current results and the latest reports.

The export is generated locally in the browser and is not uploaded by the gateway.

## Historical evidence

Reports persist bounded results, counts, status and schema fingerprints. The stable `comparison` object contains the previous report ID, total count delta and schema change flag. `comparison_details` contains per-operation count/status changes and explicit status regressions/recoveries without changing the original comparison contract.

A regression means an operation changed from `ok` to a non-OK status. This is evidence of a change, not proof of root cause; correlate it with the upstream health checks and Home Assistant release state.

## Locale and theme

The frontend supports English, Spanish, French, German, Portuguese, Italian, Chinese, Japanese, Russian, Hindi and Arabic. Locale resolution is:

1. local browser override;
2. Home Assistant compatibility context;
3. language-base normalization (`es-MX` → `es`);
4. English fallback for missing keys or unsupported languages.

Theme resolution supports `light`, `dark` and `auto`, with `prefers-color-scheme` fallback. Decorative animation stops under `prefers-reduced-motion`.

## Operator preview boundary

Preview operations are allowlisted and capability-matched:

- `ha.call_service` → `ha.write.services`;
- `ha.update_automation` → `ha.write.automations`;
- `ha.update_config` → `ha.write.configuration`.

The preview rejects oversized state maps and fields whose names indicate tokens, passwords, secrets, cookies, authorization or API keys. Every response declares approval, idempotency and rollback as requirements. No service call, configuration write or automation write is performed.
