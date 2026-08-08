#!/usr/bin/env python3
"""Bounded smoke test for a published gateway container image.

Set GATEWAY_ARTIFACT_IMAGE to run it. The script starts a temporary container,
checks imports and health endpoints through the mapped port, and always removes
that container. It never prints response bodies or environment values.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import time
from uuid import uuid4


def run(command: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=check, capture_output=True, text=True, timeout=30)


def wait_for_health(name: str) -> bool:
    timeout = float(os.environ.get("GATEWAY_ARTIFACT_HEALTH_TIMEOUT", "60"))
    deadline = time.monotonic() + max(timeout, 5.0)
    while time.monotonic() < deadline:
        response = run([
            "docker", "exec", name, "python", "-c",
            "import urllib.request; raise SystemExit(0 if urllib.request.urlopen('http://127.0.0.1:8099/health', timeout=2).status < 400 else 1)",
        ], check=False)
        if response.returncode == 0:
            return True
        time.sleep(0.25)
    return False


def print_container_diagnostics(name: str) -> None:
    """Print bounded, redacted diagnostics when liveness never comes up."""
    try:
        state = run([
            "docker", "inspect", "--format",
            "status={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}",
            name,
        ], check=False)
        logs = run(["docker", "logs", "--tail", "80", name], check=False)
        combined = f"{state.stdout.strip()}\n{logs.stdout.strip()}\n{logs.stderr.strip()}"
        redacted = re.sub(r"(?i)(bearer\s+|token|password|secret)([=:]\s*|\s+)[^\s,;]+", r"\1[REDACTED]", combined)
        print("artifact_container_diagnostics:")
        print(redacted[-12000:])
    except (OSError, subprocess.SubprocessError):
        print("artifact_container_diagnostics: unavailable")


def run_smoke(image: str) -> int:
    name = f"homeassistant-gateway-smoke-{uuid4().hex[:12]}"
    try:
        started = run(["docker", "run", "-d", "--rm", "--name", name, image])
        if not started.stdout.strip():
            print("FAIL artifact_container: no_container_id")
            return 1
        if not wait_for_health(name):
            print_container_diagnostics(name)
            print("FAIL artifact_health: timeout")
            return 1
        check = run([
            "docker", "exec", name, "python", "-c",
            "import homeassistant_gateway, fastapi, websockets; print('ok')",
        ])
        if check.stdout.strip() != "ok":
            print("FAIL artifact_imports: unexpected_result")
            return 1
        ready = run([
            "docker", "exec", name, "python", "-c",
            "import urllib.request; raise SystemExit(0 if urllib.request.urlopen('http://127.0.0.1:8099/ready', timeout=3).status < 400 else 1)",
        ], check=False)
        if ready.returncode != 0:
            print("FAIL artifact_ready: command_failed")
            return 1
        print("PASS artifact_container: running")
        print("PASS artifact_imports: ok")
        print("PASS artifact_health: ok")
        print("PASS artifact_ready: ok")
        return 0
    except subprocess.CalledProcessError as error:
        print(f"FAIL artifact_smoke: command_exit_{error.returncode}")
        return 1
    except (OSError, ValueError) as error:
        print(f"FAIL artifact_smoke: {type(error).__name__}")
        return 1
    finally:
        run(["docker", "rm", "-f", name], check=False)


def main() -> int:
    image = os.environ.get("GATEWAY_ARTIFACT_IMAGE", "").strip()
    if not image:
        print("SKIP: GATEWAY_ARTIFACT_IMAGE is not configured")
        return 0
    return run_smoke(image)


if __name__ == "__main__":
    sys.exit(main())
