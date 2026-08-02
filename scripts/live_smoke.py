#!/usr/bin/env python3
"""Run a bounded live smoke test against a Supervisor-Ingress gateway.

Required environment:
  GATEWAY_LIVE_URL: base URL, for example the Supervisor Ingress URL.

Optional environment:
  GATEWAY_INGRESS_USER_ID: trusted Ingress user id for protected API routes.
  GATEWAY_MCP_URL: streamable HTTP MCP URL to probe the HTTP boundary.
  GATEWAY_MCP_TOKEN: bearer token used only in memory for the MCP probe.

The script never prints headers, tokens, response bodies, or query values.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class Check:
    name: str
    ok: bool
    detail: str


def request(url: str, headers: dict[str, str] | None = None) -> tuple[int, bytes]:
    parsed = url.split("/", 3)
    if len(parsed) < 3 or parsed[0] not in {"http:", "https:"} or not parsed[2]:
        raise ValueError("invalid_live_url")
    req = Request(url, headers=headers or {}, method="GET")
    with urlopen(req, timeout=5) as response:
        return response.status, response.read(64 * 1024)


def run() -> int:
    base = os.environ.get("GATEWAY_LIVE_URL", "").rstrip("/")
    if not base:
        print("SKIP: GATEWAY_LIVE_URL is not configured")
        return 0

    headers = {}
    user_id = os.environ.get("GATEWAY_INGRESS_USER_ID")
    if user_id:
        headers["X-Remote-User-Id"] = user_id

    checks: list[Check] = []
    for endpoint in ("/health", "/ready"):
        try:
            status, _ = request(f"{base}{endpoint}")
            checks.append(Check(endpoint, status < 400, f"http_{status}"))
        except (OSError, ValueError) as error:
            checks.append(Check(endpoint, False, type(error).__name__))

    if user_id:
        for endpoint in ("/api/ui/context", "/api/development/catalog", "/api/health/details"):
            try:
                status, body = request(f"{base}{endpoint}", headers)
                parsed = json.loads(body)
                valid = status < 400 and isinstance(parsed, (dict, list))
                checks.append(Check(endpoint, valid, f"http_{status}"))
            except (OSError, ValueError, json.JSONDecodeError) as error:
                checks.append(Check(endpoint, False, type(error).__name__))
    else:
        checks.append(Check("protected_api", True, "SKIPPED_NO_INGRESS_USER_ID"))

    mcp_url = os.environ.get("GATEWAY_MCP_URL")
    mcp_token = os.environ.get("GATEWAY_MCP_TOKEN")
    if mcp_url and mcp_token:
        try:
            status, _ = request(mcp_url, {"Authorization": f"Bearer {mcp_token}"})
            checks.append(Check("mcp_http_boundary", status not in {401, 403}, f"http_{status}"))
        except (OSError, ValueError) as error:
            checks.append(Check("mcp_http_boundary", False, type(error).__name__))
    else:
        checks.append(Check("mcp_http_boundary", True, "SKIPPED_NO_MCP_ENV"))

    for check in checks:
        print(f"{'PASS' if check.ok else 'FAIL'} {check.name}: {check.detail}")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    sys.exit(run())
