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

Backend CI, Copilot dependency verification, and auxiliary Copilot jobs
(approval, merge queue, credential health, release/hotfix orchestration) use the
`vypdev` group with `[self-hosted, codex, Linux]`. Frontend and app-packaging CI,
publication, and ARM64 prerequisite verification use `[self-hosted, macOS, ARM64]` in the same
group. No Gateway workflow requests a GitHub-hosted runner.

Frontend CI runs inside the official Playwright Ubuntu image on the Docker-capable
Mac, retaining Linux visual snapshots and all Chromium, Firefox, and WebKit tests.
The image supplies browser libraries; no VM sudo permission or host APT change is
needed. Its digest and Playwright 1.62.1 version are pinned in
`.github/docker/frontend-ci.Dockerfile` and must be updated together with the
frontend lockfile. The container retains Node 22 and pnpm 11.15.1.

Browser containers have private networks (no published host ports), two CPUs,
4 GiB of memory, and 1 GiB of shared memory. Each suite uses two workers. The
production preview, container, and job-specific image are cleaned up after use.
Failed browser diagnostics are uploaded for seven days. Same-repository PR guards
protect the newly migrated persistent-runner CI jobs; public fork code does not
run in those jobs.

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
publish an app image or create a release. App-packaging CI uses the same private
Docker/Python setup on ARM64 and builds the full checked-out Edge image for
`linux/amd64`, retaining the previous Ubuntu packaging target without publishing.


The stable publication job and its read-only ARM64 verification share
`.github/actions/setup-release-python`. It uses uv to provision Python 3.11 and a
pip-enabled virtual environment entirely under `RUNNER_TEMP`, so it does not need
the GitHub-hosted macOS `/Users/runner` layout or privileged directory creation.
The ARM64 check runs the same dependency installation and pytest command as the
stable release job before exercising Docker/QEMU/Buildx. A Docker-only smoke is
therefore insufficient to declare release prerequisites ready. These checks do
not publish an image or create a release.

Edge SHA tags and the OCI revision label identify the checked-out `main` commit, including manual runs dispatched from another branch. For fork contributions, maintainers bring reviewed changes into a same-repository branch and run full CI there; skipped fork jobs are not validation evidence.
