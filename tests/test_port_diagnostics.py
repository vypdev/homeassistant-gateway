from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from homeassistant_gateway.infrastructure.local_port_diagnostics import LocalGatewayPortDiagnostics


class DiagnosticHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_response(200)
        elif self.path == "/mcp/":
            self.send_response(401)
        else:
            self.send_response(404)
        self.end_headers()

    def log_message(self, format: str, *_args: object) -> None:
        return


def test_local_port_diagnostics_reports_successful_local_contract() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), DiagnosticHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        result = LocalGatewayPortDiagnostics(port=server.server_port, timeout=0.5).run()
    finally:
        server.shutdown()
        thread.join(timeout=2)
        server.server_close()

    assert result["status"] == "warning"
    assert next(item for item in result["checks"] if item["name"] == "local_listener")["status"] == "ok"
    assert next(item for item in result["checks"] if item["name"] == "http_health")["http_status"] == 200
    assert next(item for item in result["checks"] if item["name"] == "http_mcp")["http_status"] == 401
    assert next(item for item in result["checks"] if item["name"] == "host_port_publication")["reason"] == "not_verifiable_from_app_container"


def test_local_port_diagnostics_reports_unreachable_port_without_secret_details() -> None:
    result = LocalGatewayPortDiagnostics(port=1, timeout=0.1).run()

    assert result["status"] == "error"
    assert result["configured"] == {"host": "0.0.0.0", "port": 1}
    listener = next(item for item in result["checks"] if item["name"] == "local_listener")
    assert listener["status"] == "error"
    assert "127.0.0.1" not in str(listener)
    assert "secret" not in str(result).lower()


def test_local_port_diagnostics_marks_host_publication_unverifiable() -> None:
    result = LocalGatewayPortDiagnostics(port=1, timeout=0.1).run()

    publication = next(item for item in result["checks"] if item["name"] == "host_port_publication")
    assert publication["status"] == "warning"
    assert publication["reason"] == "not_verifiable_from_app_container"
