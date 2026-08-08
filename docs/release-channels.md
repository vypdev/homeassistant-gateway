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
channel. Supervisor consumes the versioned multi-architecture image published
to GHCR by GitHub Actions from `main`.

- Image: `ghcr.io/vypdev/homeassistant-gateway-edge:0.5.32-edge-2`
- Source ref: `main`
- Supervisor stage: `experimental`
- Host MCP port: `18100`
- Default log level: `debug`
- Data namespace: `homeassistant_gateway_edge`
- Icon: inverted Gateway artwork

Edge is intended for development validation, not production. It can be
installed next to Stable because it has a different slug, data namespace and
host port. Tokens and configuration are intentionally not shared between the
channels.

## Branch and workflow policy

Development work is performed on `develop`. Every pull request targeting
`develop` or `main` runs the required CI checks,
including backend, frontend, browser and packaging validation.

All CI, Edge, and release workflows run on the repository's labeled self-hosted
Coolify runner (`self-hosted`, `X64`, `Linux`, `coolify`). Because this is a
public repository, pull requests must be restricted to collaborators before
they are allowed to execute on the persistent private runner.

Stable `main` is release-only. A release is prepared by opening a pull request
from `develop` to `main` with the version, changelog and release metadata
updated. After that pull request is merged, the `Release App` workflow runs on
`main`, publishes the stable multi-architecture image and creates the GitHub
release. The `Edge App` workflow also runs only on pushes to `main` and
publishes the versioned Edge image from that exact source branch. Stable `main`
does not run the development CI workflow on direct pushes.

The same policy applies if the default branch is named `master` instead of
`main`.

## Updating Edge

Edge images are built and published by the `Edge App` workflow on every push to
`main`. Each release uses an immutable `<stable>-edge-<iteration>` version tag,
alongside the moving `edge` and commit aliases, so Supervisor can detect a new
versioned Edge image.

To update Edge, follow the same procedure documented by Zigbee2MQTT:

1. Back up the Edge configuration and data.
2. Refresh the app repository in Supervisor.
3. Update `Home Assistant Gateway Edge` to the new version.
4. Restore the configuration if required.

Stable credentials and data must never be copied into Edge. Edge uses a
separate slug, data namespace and host port.

## Release policy

Stable releases continue to be driven by `addon/CHANGELOG.md` and the release
workflow. Edge publishes a separate GHCR image and does not create GitHub
releases. The two channels share source, tests and runtime behavior, but their
packaging and distribution paths remain separate.
