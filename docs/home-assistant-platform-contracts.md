# Home Assistant platform contracts

The architecture follows the current official Home Assistant extension boundaries:

- Config flows and options flows are the supported UI setup model for integrations:
  - https://developers.home-assistant.io/docs/config_entries_config_flow_handler/
  - https://developers.home-assistant.io/docs/config_entries_options_flow_handler/
- Home Assistant Apps (formerly add-ons) are Supervisor-managed applications that can start automatically and expose an Ingress UI:
  - https://developers.home-assistant.io/docs/apps/
  - https://developers.home-assistant.io/docs/supervisor/
- Custom panels are available for companion integrations, but the App remains the primary long-running server boundary:
  - https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/
- REST and WebSocket APIs are authenticated runtime boundaries:
  - https://developers.home-assistant.io/docs/api/rest/
  - https://developers.home-assistant.io/docs/api/websocket/
  - https://developers.home-assistant.io/docs/auth_api/

## Automation editing

The first implementation must treat automation editing as an investigation and capability-gated feature. Reading automation definitions is a read-only capability. Updating an automation must use a supported Home Assistant service or internal API contract where available; it must not blindly rewrite YAML or `.storage` files.

For each supported Home Assistant version, the project must record:

- the exact read contract;
- the exact mutation contract, if one exists;
- validation behavior;
- reload/restart requirements;
- rollback strategy;
- integration and end-to-end evidence.

If Home Assistant does not expose a supported update operation for a given object, the operator tool must return an explicit unsupported-operation result rather than editing private storage behind the user's back.
