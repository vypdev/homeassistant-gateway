# Automation configuration inspection

## Purpose

The gateway exposes a read-only automation inspection path for developers and observer clients. It retrieves one Home Assistant automation configuration, renders a bounded YAML representation, and returns conservative static findings. It never executes, saves, reloads, triggers or mutates an automation.

## Selection

The `automation_config` Development Console operation selects the first automation deterministically when no entity ID is supplied. An explicit `automation.*` entity ID may be provided for targeted inspection.

The adapter resolves the entity state to Home Assistant's automation configuration identifier and reads the configuration through the supported configuration endpoint. It does not read `/config/automations.yaml`, `.storage`, packages or arbitrary files.

## Result contract

A successful result contains:

- `entity_id` and friendly name;
- the Home Assistant configuration identifier;
- a sanitized structured configuration;
- a generated YAML representation;
- bounded static findings;
- trace metadata describing the read transport.

The generated YAML is canonical output. It may not preserve comments, whitespace or the original ordering of a source file.

## Findings

The initial analyzer is advisory and deliberately conservative. It reports:

- missing triggers;
- missing actions;
- `single` mode and its overlap behavior;
- an empty condition list;
- duplicate entity references;
- malformed `domain.service` references.

Future analyzers may validate entity and service references against current Home Assistant registries, correlate execution history, compare related automations and detect contradictory conditions. Those checks must remain read-only and must distinguish evidence from suggestions.

## Security and limits

- The operation is protected by the `ha.read.automation_config` capability for MCP clients.
- Responses are bounded by the gateway limits.
- Secret-like fields are replaced with `[REDACTED]` before YAML rendering or diagnostics.
- Upstream response bodies are not written to logs.
- Transport fallback is not used for command rejection, authentication failure or protocol errors.
- No write-capable Home Assistant command is registered for this feature.

## Developer Console verification

Run the `Automation configuration` item without parameters. A non-empty result proves the complete vertical path:

```text
Home Assistant entity discovery
  -> configuration identifier resolution
  -> official configuration read
  -> sanitization
  -> YAML rendering
  -> static analysis
  -> Development Console report
```

Live tests remain opt-in and require an explicitly configured target. Normal tests use deterministic local transports and never change Home Assistant state.
