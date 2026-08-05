#!/usr/bin/env python3
"""Validate the stable and Edge Home Assistant app channel contracts."""
from __future__ import annotations

from pathlib import Path
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
    if "image" in edge:
        errors.append("edge must omit image so Supervisor builds it locally")
    if stable.get("slug") == edge.get("slug"):
        errors.append("stable and edge slugs must be distinct")
    if stable.get("stage") != "stable":
        errors.append("stable must be explicitly marked as stable")
    if edge.get("stage") != "experimental":
        errors.append("edge must be explicitly marked as experimental")
    if port(stable) == port(edge):
        errors.append("stable and edge host ports must be distinct")
    edge_dockerfile = (EDGE / "Dockerfile").read_text(encoding="utf-8")
    if "ARG GATEWAY_REF=develop" not in edge_dockerfile:
        errors.append("edge Dockerfile must default to the develop ref")
    for required_label in ('io.hass.version', 'io.hass.type="app"', 'io.hass.arch'):
        if required_label not in edge_dockerfile:
            errors.append(f"edge Dockerfile is missing label {required_label}")
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
    print("PASS app-channel: stable=image edge=local-build ref=develop")
    return 0


if __name__ == "__main__":
    sys.exit(main())
