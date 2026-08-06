# Home Assistant Gateway Edge

This directory contains the development app variant of Home Assistant Gateway.

Like the Zigbee2MQTT Edge app, Edge uses a fixed `edge` version and a published
per-architecture GHCR image. The image is built by GitHub Actions from the
`develop` branch and consumed by Supervisor through `config.yaml`.

The published images are:

- `ghcr.io/vypdev/homeassistant-gateway-edge-amd64:edge`
- `ghcr.io/vypdev/homeassistant-gateway-edge-aarch64:edge`
- `ghcr.io/vypdev/homeassistant-gateway-edge-armv7:edge`

Edge does not build a Docker image locally in Supervisor. To update Edge,
backup its data, uninstall it, refresh the repository and install it again,
then restore the configuration if required.

## Development catalog

Edge embeds the Storybook catalog generated from the same `develop` source tree. Open it through the Supervisor Ingress URL at `/catalog/` (for example, `http://<ingress>/catalog/`). Stable does not include this catalog.

The catalog is presentation-only and uses static fixtures. It does not call Home Assistant, the Gateway API, or any live endpoint.

Edge is for development validation. It uses an isolated slug, data directory
and host port so it can coexist with Stable:

- Stable: `homeassistant_gateway`, host port `18099`
- Edge: `homeassistant_gateway_edge`, host port `18100`

Do not copy Stable credentials into Edge. Create separate development clients and
revoke them independently.
