from __future__ import annotations

import os
import subprocess
import sys
import time

import httpx

import pytest

from homeassistant_gateway.infrastructure.home_assistant.client_adapter import HomeAssistantClient


@pytest.mark.integration
def test_standalone_client_against_fake_rest_and_websocket_target() -> None:
    env = {**os.environ, "PYTHONPATH": "src", "FAKE_HA_TOKEN": "fixture-token"}
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "scripts.fake_home_assistant:app", "--host", "127.0.0.1", "--port", "18991"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(30):
            try:
                if httpx.get("http://127.0.0.1:18991/api", timeout=1).status_code == 401:
                    break
            except httpx.HTTPError:
                time.sleep(0.2)
        else:
            raise AssertionError("fake_home_assistant_not_ready")

        client = HomeAssistantClient("fixture-token", base_url="http://127.0.0.1:18991/api")
        states = client.states()
        assert states[0]["entity_id"] == "sensor.fixture"
        assert client._ws_command("config/entity_registry/list") == states
    finally:
        process.terminate()
        process.wait(timeout=10)
