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

## Tool naming

Tool names should be stable and capability-oriented, for example:

```text
homeassistant_gateway__ha_inventory
homeassistant_gateway__ha_states
homeassistant_gateway__ha_automations
homeassistant_gateway__ha_configuration
homeassistant_gateway__ha_analysis_context
```

Operator tools must have distinct names or explicit capability metadata so a client cannot mistake a mutating tool for a read-only one.

## Rollout

1. Deploy the integration with observer only.
2. Verify state, configuration, automation, repeated-call, and audit behavior from a disposable OpenClaw/Hermes client.
3. Add operator provisioning UI but keep it disabled.
4. Verify policy and rollback tests.
5. Enable one narrow operator capability for a dedicated test client.
6. Expand only after real end-to-end evidence.
