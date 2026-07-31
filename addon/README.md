# Home Assistant App

This directory is the first Supervisor App packaging boundary for `homeassistant-gateway`.

The App is intentionally not enabled as a production server yet. Before publishing a runnable image, the project must add:

- a pinned multi-architecture image build;
- the MCP transport implementation;
- ingress-aware UI routing;
- secure client/token storage and migration;
- Home Assistant REST/WebSocket adapters;
- policy and audit enforcement;
- health/readiness checks;
- integration and end-to-end tests against a disposable Home Assistant instance.

The App uses `homeassistant_api` and `hassio_api` rather than Docker socket access. Raw `/config` is not mapped by default.
