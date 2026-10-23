from __future__ import annotations

import socket
import threading
import time

import httpx
import pytest
import uvicorn

from homeassistant_gateway.infrastructure.home_assistant.client_adapter import HomeAssistantClient
from scripts import fake_home_assistant


@pytest.mark.integration
def test_standalone_client_against_fake_rest_and_websocket_target(monkeypatch) -> None:
    monkeypatch.setattr(fake_home_assistant, "TOKEN", "fixture-token")
    # Keep the ephemeral listener reserved until Uvicorn takes ownership.
    listener = socket.create_server(("127.0.0.1", 0))
    base = f"http://127.0.0.1:{listener.getsockname()[1]}"
    server = uvicorn.Server(uvicorn.Config(fake_home_assistant.app, log_level="error", lifespan="off"))
    thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
    thread.start()
    try:
        for _ in range(30):
            if server.started:
                break
            time.sleep(0.2)
        else:
            raise AssertionError("fake_home_assistant_not_ready")
        assert httpx.get(base + "/api", timeout=1).status_code == 401
        client = HomeAssistantClient("fixture-token", base_url=base + "/api")
        states = client.states()
        assert states[0]["entity_id"] == "sensor.fixture"
        assert client._ws_command("config/entity_registry/list") == states
    finally:
        server.should_exit = True
        thread.join(timeout=10)
        listener.close()
        assert not thread.is_alive(), "fake_home_assistant_shutdown_timeout"
