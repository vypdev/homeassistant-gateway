#!/usr/bin/env python3
"""Real standalone smoke test against a clean Home Assistant Container.

This is an authorized host smoke test, not a CI test. It creates an isolated
Home Assistant Container, performs onboarding with ephemeral credentials,
creates a one-day Long-Lived Access Token through the official WebSocket API,
starts the gateway image, validates readiness, scans logs, and always cleans
up the containers, network, volume, and temporary secret file.

Required environment:
  GATEWAY_SMOKE_IMAGE: local or published gateway image.
Optional:
  HOME_ASSISTANT_IMAGE: immutable Home Assistant image digest.
"""
from __future__ import annotations

import json
import os
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_HA_IMAGE = (
    "ghcr.io/home-assistant/home-assistant@"
    "sha256:14931c6b13756317849f46da1d01b45937a1150db66c081cfe529d48215943fe"
)


def docker(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, capture_output=True, text=True, timeout=90)


def published_local_url(container: str, container_port: int) -> str:
    address = docker(["docker", "port", container, f"{container_port}/tcp"]).stdout.strip()
    parsed = urllib.parse.urlsplit(f"http://{address}")
    if parsed.hostname != "127.0.0.1" or parsed.port is None:
        raise RuntimeError("smoke_port_must_be_loopback")
    return f"http://127.0.0.1:{parsed.port}"


class _RejectRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def require_protected_health_details(base: str) -> None:
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _RejectRedirects())
    try:
        with opener.open(base + "/api/health/details", timeout=10) as response:
            status = response.status
    except urllib.error.HTTPError as error:
        status = error.code
        error.close()
    if status != 401:
        raise RuntimeError("gateway_protected_endpoint")


def http_json(base: str, path: str, data: dict[str, str] | None = None, headers: dict[str, str] | None = None) -> tuple[int, dict]:
    if path == "/auth/token":
        body = urllib.parse.urlencode(data or {}).encode()
        content_type = "application/x-www-form-urlencoded"
    else:
        body = None if data is None else json.dumps(data).encode()
        content_type = "application/json"
    request = urllib.request.Request(
        base + path,
        data=body,
        headers={"Content-Type": content_type, **(headers or {})},
        method="POST" if data is not None else "GET",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.status, json.loads(response.read() or b"{}")


def wait_for_onboarding(base: str) -> None:
    for _ in range(120):
        try:
            if http_json(base, "/api/onboarding")[0] == 200:
                return
        except (OSError, urllib.error.HTTPError):
            pass
        time.sleep(2)
    raise RuntimeError("ha_onboarding_not_ready")


def create_long_lived_token(base: str) -> str:
    import websockets.sync.client

    client_id = "https://example.com/homeassistant-gateway-smoke"
    _, user = http_json(
        base,
        "/api/onboarding/users",
        {
            "name": "Standalone Smoke User",
            "username": "smoke_" + secrets.token_hex(6),
            "password": secrets.token_urlsafe(24),
            "client_id": client_id,
            "language": "en",
        },
    )
    _, auth = http_json(
        base,
        "/auth/token",
        {
            "grant_type": "authorization_code",
            "code": user["auth_code"],
            "client_id": client_id,
            "redirect_uri": client_id,
        },
    )
    with websockets.sync.client.connect(
        base.replace("http://", "ws://") + "/api/websocket", open_timeout=20, close_timeout=5
    ) as websocket:
        websocket.recv()
        websocket.send(json.dumps({"type": "auth", "access_token": auth["access_token"]}))
        if json.loads(websocket.recv()).get("type") != "auth_ok":
            raise RuntimeError("ha_websocket_auth")
        websocket.send(json.dumps({"id": 1, "type": "auth/long_lived_access_token", "lifespan": 1, "client_name": "gateway-smoke"}))
        result = json.loads(websocket.recv())
    token = result.get("result")
    if not result.get("success") or not isinstance(token, str):
        raise RuntimeError("ha_long_lived_token")
    return token


def main() -> int:
    image = os.environ.get("GATEWAY_SMOKE_IMAGE", "").strip()
    if not image:
        print("SKIP: GATEWAY_SMOKE_IMAGE is not configured")
        return 0
    ha_image = os.environ.get("HOME_ASSISTANT_IMAGE", DEFAULT_HA_IMAGE)
    suffix = secrets.token_hex(5)
    ha_name = f"gateway-smoke-ha-{suffix}"
    gateway_name = f"gateway-smoke-gateway-{suffix}"
    network = f"gateway-smoke-network-{suffix}"
    volume = f"gateway-smoke-volume-{suffix}"
    secret_directory = Path(tempfile.mkdtemp(prefix=f"gateway-smoke-{suffix}-"))
    secret_file = secret_directory / "gateway.env"
    try:
        docker(["docker", "network", "create", network])
        docker(["docker", "volume", "create", volume])
        docker(["docker", "run", "-d", "--rm", "--name", ha_name, "--network", network, "-p", "127.0.0.1::8123", "-v", f"{volume}:/config", ha_image])
        ha_base = published_local_url(ha_name, 8123)
        wait_for_onboarding(ha_base)
        token = create_long_lived_token(ha_base)
        secret_file.write_text(
            f"GATEWAY_HOME_ASSISTANT_MODE=standalone\nGATEWAY_HOME_ASSISTANT_URL=http://{ha_name}:8123\nGATEWAY_HOME_ASSISTANT_TOKEN={token}\nGATEWAY_OPERATOR_ENABLED=false\nGATEWAY_DATA_DIR=/data\n",
            encoding="utf-8",
        )
        secret_file.chmod(0o600)
        docker(["docker", "run", "-d", "--rm", "--name", gateway_name, "--network", network, "-p", "127.0.0.1::8099", "--env-file", str(secret_file), image])
        gateway_base = published_local_url(gateway_name, 8099)
        for _ in range(60):
            try:
                if urllib.request.urlopen(gateway_base + "/ready", timeout=10).status == 200:
                    break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError("gateway_ready_timeout")
        ready = http_json(gateway_base, "/ready")[1]
        if ready.get("home_assistant") != "ready":
            raise RuntimeError("gateway_home_assistant_not_ready")
        require_protected_health_details(gateway_base)
        logs = docker(["docker", "logs", gateway_name]).stdout
        if token in logs:
            raise RuntimeError("gateway_secret_log_leak")
        print("PASS clean_home_assistant_container")
        print("PASS gateway_container_started")
        print("PASS gateway_ready_against_real_home_assistant")
        print("PASS gateway_protected_health_details")
        print("PASS gateway_secret_log_scan")
        return 0
    finally:
        subprocess.run(["docker", "rm", "-f", gateway_name], check=False, capture_output=True)
        subprocess.run(["docker", "rm", "-f", ha_name], check=False, capture_output=True)
        subprocess.run(["docker", "network", "rm", network], check=False, capture_output=True)
        subprocess.run(["docker", "volume", "rm", volume], check=False, capture_output=True)
        secret_file.unlink(missing_ok=True)
        secret_directory.rmdir()


if __name__ == "__main__":
    raise SystemExit(main())
