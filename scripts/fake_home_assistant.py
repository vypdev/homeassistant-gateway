"""Minimal Home Assistant Core REST/WebSocket fake for CI integration tests."""
from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect

TOKEN = os.environ.get("FAKE_HA_TOKEN", "fixture-token")
app = FastAPI(title="fake-home-assistant")
STATES = [
    {"entity_id": "sensor.fixture", "state": "ready", "attributes": {"friendly_name": "Fixture"}},
    {"entity_id": "script.fixture", "state": "off", "attributes": {}},
]
REGISTRIES: dict[str, list[dict[str, Any]]] = {
    "config/device_registry/list": [],
    "config/area_registry/list": [],
    "config/floor_registry/list": [],
    "config/label_registry/list": [],
    "config/entity_registry/list": STATES,
}


def require_token(authorization: str | None) -> None:
    if authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/api")
def api(authorization: str | None = Header(default=None)) -> dict[str, str]:
    require_token(authorization)
    return {"message": "API running.", "ha_version": "fixture"}


@app.get("/api/config")
def config(authorization: str | None = Header(default=None)) -> dict[str, str]:
    require_token(authorization)
    return {"location_name": "Fixture Home", "version": "fixture"}


@app.get("/api/states")
def states(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_token(authorization)
    return STATES


@app.get("/api/states/{entity_id:path}")
def state(entity_id: str, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    for item in STATES:
        if item["entity_id"] == entity_id:
            return item
    raise HTTPException(status_code=404, detail="not found")


@app.websocket("/api/websocket")
async def websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    await websocket.send_json({"type": "auth_required", "ha_version": "fixture"})
    try:
        auth = await websocket.receive_json()
        if auth.get("type") != "auth" or auth.get("access_token") != TOKEN:
            await websocket.send_json({"type": "auth_invalid", "message": "Invalid access token"})
            await websocket.close(code=1008)
            return
        await websocket.send_json({"type": "auth_ok", "ha_version": "fixture"})
        while True:
            message = await websocket.receive_json()
            command = message.get("command") or message.get("type", "")
            if message.get("type") == "get_states":
                result: Any = STATES
            elif command in REGISTRIES:
                result = REGISTRIES[command]
            elif message.get("type") == "get_config":
                result = {"location_name": "Fixture Home", "version": "fixture"}
            else:
                result = []
            await websocket.send_json({"id": message.get("id"), "type": "result", "success": True, "result": result})
    except WebSocketDisconnect:
        return
