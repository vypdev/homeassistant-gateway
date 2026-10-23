from __future__ import annotations

import io
import stat
import subprocess
import urllib.error
from pathlib import Path

import pytest
import yaml

from scripts import standalone_real_smoke


def test_standalone_compose_publishes_only_on_host_loopback() -> None:
    compose = yaml.safe_load((Path(__file__).parents[1] / "deploy/standalone/compose.yaml").read_text())
    ports = compose["services"]["homeassistant-gateway"]["ports"]
    assert ports and all(port.startswith("127.0.0.1:") for port in ports)


def test_real_smoke_discovers_the_assigned_ephemeral_loopback_port(monkeypatch) -> None:
    monkeypatch.setattr(standalone_real_smoke, "docker", lambda command: subprocess.CompletedProcess(command, 0, "127.0.0.1:49123\n", ""))
    assert standalone_real_smoke.published_local_url("fixture", 8123) == "http://127.0.0.1:49123"


def test_real_smoke_rejects_an_externally_published_port(monkeypatch) -> None:
    monkeypatch.setattr(standalone_real_smoke, "docker", lambda command: subprocess.CompletedProcess(command, 0, "0.0.0.0:49123\n", ""))
    with pytest.raises(RuntimeError, match="smoke_port_must_be_loopback"):
        standalone_real_smoke.published_local_url("fixture", 8123)


@pytest.mark.parametrize("status", [200, 204, 302, 403, 500])
def test_protected_health_probe_rejects_unexpected_status_and_closes_response(monkeypatch, status):
    response = io.BytesIO(b"fixture-only-response")
    response.status = status

    def urlopen(url, timeout):
        assert url == "http://127.0.0.1:49123/api/health/details" and timeout == 10
        if status >= 300:
            raise urllib.error.HTTPError(url, status, "fixture", {}, response)
        return response

    monkeypatch.setattr(standalone_real_smoke.urllib.request, "urlopen", urlopen)
    with pytest.raises(RuntimeError, match="gateway_protected_endpoint"):
        standalone_real_smoke.require_protected_health_details("http://127.0.0.1:49123")
    assert response.closed


def test_protected_health_probe_accepts_only_unauthorized_and_closes_error(monkeypatch):
    response = io.BytesIO(b"fixture-unauthorized")

    def urlopen(url, timeout):
        raise urllib.error.HTTPError(url, 401, "fixture", {}, response)

    monkeypatch.setattr(standalone_real_smoke.urllib.request, "urlopen", urlopen)
    standalone_real_smoke.require_protected_health_details("http://127.0.0.1:49123")
    assert response.closed


def test_protected_health_probe_fails_closed_on_transport_error(monkeypatch):
    def urlopen(url, timeout):
        raise OSError("fixture-offline")

    monkeypatch.setattr(standalone_real_smoke.urllib.request, "urlopen", urlopen)
    with pytest.raises(OSError, match="fixture-offline"):
        standalone_real_smoke.require_protected_health_details("http://127.0.0.1:49123")


def test_smoke_keeps_fixture_token_private_and_removes_its_directory(monkeypatch, tmp_path):
    monkeypatch.setenv("GATEWAY_SMOKE_IMAGE", "fixture-image")
    monkeypatch.setattr(standalone_real_smoke.tempfile, "tempdir", str(tmp_path))
    files = []

    def docker(command):
        if "--env-file" in command:
            path = Path(command[command.index("--env-file") + 1])
            assert stat.S_IMODE(path.parent.stat().st_mode) == 0o700
            assert stat.S_IMODE(path.stat().st_mode) == 0o600
            assert "fixture-only-token" in path.read_text()
            files.append(path)
        return subprocess.CompletedProcess(command, 0, "", "")

    def urlopen(url, timeout):
        response = io.BytesIO(b"fixture-ready")
        response.status = 200
        return response

    monkeypatch.setattr(standalone_real_smoke, "docker", docker)
    monkeypatch.setattr(standalone_real_smoke, "published_local_url", lambda *args: "http://127.0.0.1:49123")
    monkeypatch.setattr(standalone_real_smoke, "wait_for_onboarding", lambda *args: None)
    monkeypatch.setattr(standalone_real_smoke, "create_long_lived_token", lambda *args: "fixture-only-token")
    monkeypatch.setattr(standalone_real_smoke, "http_json", lambda *args: (200, {"home_assistant": "ready"}))
    monkeypatch.setattr(standalone_real_smoke, "require_protected_health_details", lambda *args: None)
    monkeypatch.setattr(standalone_real_smoke.urllib.request, "urlopen", urlopen)
    monkeypatch.setattr(standalone_real_smoke.subprocess, "run", lambda *args, **kwargs: None)
    assert standalone_real_smoke.main() == 0
    assert len(files) == 1 and not files[0].parent.exists()
