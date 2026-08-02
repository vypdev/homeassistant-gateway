from __future__ import annotations

import http.client
import os
import socket
from typing import Any


class LocalGatewayPortDiagnostics:
    """Inspect only the gateway's own bounded local listener.

    External host-port publication and firewall policy are deliberately reported as
    unverifiable here; the add-on container cannot prove LAN reachability.
    """

    def __init__(self, port: int | None = None, timeout: float = 1.0) -> None:
        self._port = port if port is not None else int(os.getenv("GATEWAY_PORT", "8099"))
        self._host = os.getenv("GATEWAY_HOST", "0.0.0.0")
        self._timeout = min(max(timeout, 0.1), 3.0)

    def run(self) -> dict[str, Any]:
        checks = [
            self._listener_check(),
            self._http_check("/health", expected=(200,)),
            self._http_check("/mcp/", expected=(401,)),
            {
                "name": "host_port_publication",
                "status": "warning",
                "configured_port": self._port,
                "reason": "not_verifiable_from_app_container",
                "detail": "Supervisor host-port mapping and LAN firewall require an external check.",
            },
        ]
        status = "error" if any(item["status"] == "error" for item in checks) else "warning" if any(item["status"] == "warning" for item in checks) else "ok"
        return {
            "status": status,
            "configured": {"host": self._host, "port": self._port},
            "checks": checks,
        }

    def _listener_check(self) -> dict[str, Any]:
        try:
            with socket.create_connection(("127.0.0.1", self._port), timeout=self._timeout):
                return {"name": "local_listener", "status": "ok", "port": self._port, "detail": "TCP listener accepts local connections."}
        except OSError as error:
            return {"name": "local_listener", "status": "error", "port": self._port, "reason": type(error).__name__, "detail": "TCP listener is not reachable locally."}

    def _http_check(self, path: str, expected: tuple[int, ...]) -> dict[str, Any]:
        try:
            connection = http.client.HTTPConnection("127.0.0.1", self._port, timeout=self._timeout)
            connection.request("GET", path, headers={"Accept": "application/json"})
            response = connection.getresponse()
            status_code = response.status
            response.read(256)
            connection.close()
            return {
                "name": "http_" + path.strip("/").replace("/", "_"),
                "status": "ok" if status_code in expected else "error",
                "http_status": status_code,
                "expected_statuses": list(expected),
                "detail": "HTTP contract matches the local diagnostic expectation." if status_code in expected else "HTTP contract did not match the local diagnostic expectation.",
            }
        except (OSError, http.client.HTTPException) as error:
            return {"name": "http_" + path.strip("/").replace("/", "_"), "status": "error", "reason": type(error).__name__, "detail": "Local HTTP check failed."}
