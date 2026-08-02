# OpenClaw and Hermes integration

## Observer client

OpenClaw and Hermes should connect using a dedicated observer client identity provisioned in the Home Assistant UI. The client receives only read capabilities and has an explicit display name, expiration/rotation metadata, and audit correlation.

The client configuration must not contain the Home Assistant administrator password or a general-purpose long-lived Home Assistant token.

## Operator client

Operator access is a separate identity and transport configuration. It must not be enabled by changing a prompt or adding a tool name to an OpenClaw allowlist. Provisioning happens in Home Assistant and is visible in the panel.

The operator client should be used only for targeted workflows and should support:

- capability list inspection;
- approval-required responses;
- dry-run/diff output;
- correlation IDs;
- emergency revocation.

For native MCP clients such as Hermes, use the published Home Assistant host port instead of the browser-only Ingress URL:

```text
http://<home-assistant-host>:8099/mcp/
```

Send the dedicated observer client token as `Authorization: Bearer <observer-token>`. The port publishes only the gateway's authenticated MCP transport; the management UI remains behind Supervisor Ingress.

## Observer MCP tools

The published observer server registers these read-only tools:

```text
gateway_diagnostics
ha_inventory
ha_states
ha_automations
ha_configuration
ha_history
ha_logbook
ha_services
ha_events
ha_devices
ha_areas
ha_floors
ha_labels
ha_entity_registry
ha_scripts
ha_scenes
ha_helpers
ha_integrations
```

All tools use the same application read port and bounded Home Assistant adapter. `ha_history` and `ha_logbook` accept optional `entity_id` and `start_time`; when no entity is supplied, the adapter selects one real entity for a bounded reachability probe.

Operator tools are not registered in this release. Operator preview is available only through the Ingress Development Console and never executes a mutation.


## Rollout

1. Deploy the integration with observer only.
2. Verify state, configuration, automation, repeated-call, and audit behavior from a disposable OpenClaw/Hermes client.
3. Add operator provisioning UI but keep it disabled.
4. Verify policy and rollback tests.
5. Enable one narrow operator capability for a dedicated test client.
6. Expand only after real end-to-end evidence.
