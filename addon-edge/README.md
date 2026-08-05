# Home Assistant Gateway Edge

This directory contains the development app variant of Home Assistant Gateway.

Unlike the stable `addon/` package, Edge intentionally has no published image in
`config.yaml`. Home Assistant Supervisor builds `Dockerfile` during installation
or rebuild. The Dockerfile fetches the `develop` branch, validates the frontend
with pnpm, generates the production frontend bundle, and packages the same
runtime used by Stable.

Edge is for development validation. It uses an isolated slug, data directory
and host port so it can coexist with Stable:

- Stable: `homeassistant_gateway`, host port `18099`
- Edge: `homeassistant_gateway_edge`, host port `18100`

Do not copy Stable credentials into Edge. Create separate development clients and
revoke them independently.
