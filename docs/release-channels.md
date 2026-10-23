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

- Image: `ghcr.io/vypdev/homeassistant-gateway-edge:0.5.35-edge-1`
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

Backend CI and Copilot dependency verification use the `vypdev` group with
`[self-hosted, codex, Linux]`. Frontend and app-packaging CI use GitHub-hosted
Ubuntu; publication and its ARM64 prerequisite verification use the Docker-capable
Mac described below. Because this is a public repository, pull requests must be
restricted to collaborators before executing on persistent private runners.

Frontend CI prefers Ubuntu's primary package archive, with the Azure mirror as a
fallback, before installing Playwright's system dependencies. APT uses one retry
and a 15-second connection/inactivity timeout, and browser installation has a
10-minute step limit. A degraded mirror therefore cannot hold the job for hours.
Chromium, Firefox, WebKit, and all browser tests remain required. This changes only
the disposable GitHub-hosted runner's package-download configuration.

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


## Docker-capable publication runners

`Release App` and `Edge App` run on `[self-hosted, macOS, ARM64]` in the `vypdev`
group, using the Apple Silicon host's Docker daemon. The older Mac and the
Linux/Windows VMs do not provide Docker. Output platforms remain `linux/amd64`,
`linux/arm64`, and `linux/arm/v7`; the existing version/tag publication guards are
unchanged. A stable run whose version already exists still checks the Docker
daemon before skipping publication.

The repository's `prepare-docker` action checks Docker and retains the host daemon
endpoint while giving each job a private client configuration in `RUNNER_TEMP`.
Edge performs the same preparation inline before its intentional `main` checkout,
so it does not require a local action from a different source revision.
Registry credentials and builder selection therefore do not share the host user's
Docker configuration. Keep Docker available in both ARM64 runners' service PATH
and keep the Mac awake. Both runners share the same physical CPU, memory, and daemon.

`Docker runner verification` checks the same setup, QEMU, and Buildx actions on
relevant same-repository PRs. It builds a minimal image for all three target
architectures with read-only repository permissions and `push: false`. It does not
publish an app image or create a release. Existing app-packaging CI retains its
GitHub-hosted Ubuntu runner.


The stable publication job and its read-only ARM64 verification share
`.github/actions/setup-release-python`. It uses uv to provision Python 3.11 and a
pip-enabled virtual environment entirely under `RUNNER_TEMP`, so it does not need
the GitHub-hosted macOS `/Users/runner` layout or privileged directory creation.
The ARM64 check runs the same dependency installation and pytest command as the
stable release job before exercising Docker/QEMU/Buildx. A Docker-only smoke is
therefore insufficient to declare release prerequisites ready. These checks do
not publish an image or create a release.
