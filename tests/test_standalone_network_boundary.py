from __future__ import annotations

import subprocess
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
