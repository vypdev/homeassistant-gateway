# Stable and Edge app channels

This repository exposes two Home Assistant apps from the same app repository.

## Stable

`Home Assistant Gateway` (`homeassistant_gateway`) is the production channel.
It consumes the multi-architecture image published to GHCR by the release
workflow. Stable follows `master` and is updated through tagged releases.

- Image: `ghcr.io/vypdev/homeassistant-gateway:<version>`
- Host MCP port: `18099`
- Default log level: `info`
- Data namespace: `homeassistant_gateway`

## Edge

`Home Assistant Gateway Edge` (`homeassistant_gateway_edge`) is the development
channel. Supervisor consumes the versioned multi-architecture image published
to GHCR by GitHub Actions from the triggering `master` or `develop` commit.

- Image: `ghcr.io/vypdev/homeassistant-gateway-edge:0.5.35-edge-1`
- Source refs: `master` and `develop`
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
`develop` or `master` runs the required CI checks,
including backend, frontend, browser and packaging validation.

CI, Edge, image publication and RepoWise run on disposable GitHub-hosted Ubuntu
runners. Agent jobs keep the separately reviewed self-hosted `vypdev` route.

Stable `master` is the production branch. Release and Hotfix issues use the
installed Copilot lifecycle and require an explicit `deploy` launch plus protected
production promotion. `release_workflow.yml` and `hotfix_workflow.yml` prepare
version metadata and call the single reusable `Release App` image publisher only
after Copilot verifies the accepted production tag. Image build, scan and smoke
must succeed before Copilot creates the GitHub Release and records completion.
There is no competing publisher on ordinary pushes.

`Edge App` builds the exact triggering commit on `master` or `develop`; it never
checks out the retained legacy `main` branch. Commit image tags identify immutable
source revisions. Maintainers advance the app's Edge version when Supervisor
should offer an update; the `edge` alias tracks the latest published build.

See [repository automation](repository-automation.md) for verification, initial
default-branch rollout, development backmerge and failure recovery.

## Updating Edge

Edge images are built and published by the `Edge App` workflow on supported source changes pushed to
`master` or `develop`. The workflow publishes the configured `<stable>-edge-<iteration>` version tag,
alongside the moving `edge` alias and exact-commit tag. Advance the configured
iteration before requesting a Supervisor update; pushes with the same app version
can replace its version tag. Only the exact-commit tag identifies that build.

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
