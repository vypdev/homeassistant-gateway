# Stable and Edge app channels

This repository exposes two Home Assistant apps from the same app repository.

## Stable

`Home Assistant Gateway` (`homeassistant_gateway`) is the production channel.
It consumes the multi-architecture image published to GHCR by the release
workflow. Stable follows `main` and is updated through tagged releases.

- Image: `ghcr.io/vypdev/homeassistant-gateway:<version>`
- Host MCP port: `18099`
- Default log level: `info`
- Data namespace: `homeassistant_gateway`

## Edge

`Home Assistant Gateway Edge` (`homeassistant_gateway_edge`) is the development
channel. It has no `image` field, so Supervisor builds it from
`addon-edge/Dockerfile` when the app is installed or rebuilt. The Dockerfile
fetches the `develop` branch, runs frontend checks and builds the frontend before
assembling the runtime image.

- Source ref: `develop`
- Supervisor stage: `experimental`
- Host MCP port: `18100`
- Default log level: `debug`
- Data namespace: `homeassistant_gateway_edge`
- Icon: inverted Gateway artwork

Edge is intended for development validation, not production. It can be
installed next to Stable because it has a different slug, data namespace and
host port. Tokens and configuration are intentionally not shared between the
channels.

## Updating Edge

Edge tracks the current `develop` branch. After pushing a new development
commit, refresh the app repository and rebuild/reinstall the Edge app from the
Supervisor UI. A local checkout with uncommitted changes is not visible to a
remote Supervisor build; changes must be committed and pushed first.

The Edge version is deliberately explicit (`MAJOR.MINOR.PATCH-dev.N`) so
Supervisor can identify the channel. Increment it when a new Edge build needs to
be recognized as an update.

## Release policy

Stable releases continue to be driven by `addon/CHANGELOG.md` and the release
workflow. Edge does not publish a GHCR image and does not create GitHub releases.
The two channels share source, tests and runtime behavior, but their packaging
and distribution paths remain separate.
