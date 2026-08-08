#!/usr/bin/env python3
"""Validate the stable and Edge Home Assistant app channel contracts."""
from __future__ import annotations

from pathlib import Path
import re
import sys

import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
STABLE = ROOT / "addon"
EDGE = ROOT / "addon-edge"


def load_config(directory: Path) -> dict[str, object]:
    with (directory / "config.yaml").open(encoding="utf-8") as handle:
        value = yaml.safe_load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{directory}/config.yaml must contain a mapping")
    return value


def port(config: dict[str, object]) -> str:
    ports = config.get("ports")
    if not isinstance(ports, dict) or len(ports) != 1:
        raise ValueError("each app must declare exactly one host port mapping")
    return str(next(iter(ports.values())))


def main() -> int:
    stable = load_config(STABLE)
    edge = load_config(EDGE)
    errors: list[str] = []

    if stable.get("image") != "ghcr.io/vypdev/homeassistant-gateway":
        errors.append("stable must consume the published GHCR image")
    if edge.get("image") != "ghcr.io/vypdev/homeassistant-gateway-edge":
        errors.append("edge must consume the published multi-architecture GHCR image")
    stable_version = stable.get("version")
    edge_version = edge.get("version")
    if not isinstance(stable_version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", stable_version):
        errors.append("stable must use a semantic release version")
    elif not isinstance(edge_version, str) or not re.fullmatch(
        rf"{re.escape(stable_version)}-edge-\d+", edge_version
    ):
        errors.append("edge version must match <stable>-edge-<iteration>")
    if stable.get("slug") == edge.get("slug"):
        errors.append("stable and edge slugs must be distinct")
    if stable.get("stage") != "stable":
        errors.append("stable must be explicitly marked as stable")
    if edge.get("stage") != "experimental":
        errors.append("edge must be explicitly marked as experimental")
    if port(stable) == port(edge):
        errors.append("stable and edge host ports must be distinct")
    edge_dockerfile = (EDGE / "Dockerfile").read_text(encoding="utf-8")
    if "COPY . /src" not in edge_dockerfile:
        errors.append("edge Dockerfile must build from the checked-out main source")
    for required_label in ('io.hass.version', 'io.hass.type="app"'):
        if required_label not in edge_dockerfile:
            errors.append(f"edge Dockerfile is missing label {required_label}")
    if "COPY --from=ui-builder /frontend/storybook-static /app/catalog" not in edge_dockerfile:
        errors.append("edge Dockerfile must embed the Storybook catalog at /app/catalog")
    if "corepack pnpm run storybook:build" not in edge_dockerfile:
        errors.append("edge Dockerfile must build the Storybook catalog")
    http_source = (ROOT / "src/homeassistant_gateway/presentation/http.py").read_text(encoding="utf-8")
    if 'app.mount("/catalog", StaticFiles(directory=UI_CATALOG_DIST, html=True), name="ui-catalog")' not in http_source:
        errors.append("presentation HTTP adapter must expose the embedded catalog at /catalog")
    for directory in (STABLE, EDGE):
        icon = directory / "icon.png"
        if not icon.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
            errors.append(f"{icon} is not a PNG")
        try:
            with Image.open(icon) as image:
                alpha = image.getchannel("A") if "A" in image.getbands() else None
                if image.mode != "RGBA" or alpha is None or any(alpha.getpixel(point) != 0 for point in ((0, 0), (255, 0), (0, 255), (255, 255))):
                    errors.append(f"{icon} must have transparent rounded corners")
        except (OSError, ValueError) as error:
            errors.append(f"{icon} cannot be inspected: {error}")
        if not (directory / "run.sh").exists():
            errors.append(f"{directory}/run.sh is missing")

    if errors:
        for error in errors:
            print(f"FAIL app-channel: {error}")
        return 1

    print(f"PASS app-channel: stable={stable['slug']}:{port(stable)} edge={edge['slug']}:{port(edge)}")
    print(f"PASS app-channel: stable=image edge=multi-architecture-image version={edge_version} source=main")
    return 0


if __name__ == "__main__":
    sys.exit(main())
