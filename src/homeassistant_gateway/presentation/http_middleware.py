from __future__ import annotations

import re
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, status
from fastapi.responses import JSONResponse, Response


async def request_identity_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
    record_audit: Callable[[Request, Response, str, str], None],
) -> Response:
    candidate_request_id = request.headers.get("x-request-id", "")
    request_id = candidate_request_id if re.fullmatch(r"[A-Za-z0-9._-]{1,64}", candidate_request_id) else uuid.uuid4().hex
    request.state.request_id = request_id

    direct_mcp_transport = request.url.path in {"/mcp", "/mcp/"}
    if request.url.path not in {"/health", "/ready"} and not direct_mcp_transport:
        remote_user_id = request.headers.get("x-remote-user-id")
        if not remote_user_id:
            response = JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "ingress_identity_required"})
            response.headers["X-Request-ID"] = request_id
            record_audit(request, response, "denied", "rejected")
            return response
        request.state.remote_user_id = remote_user_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    catalog_request = request.url.path == "/catalog" or request.url.path.startswith("/catalog/")
    response.headers["X-Frame-Options"] = "SAMEORIGIN" if catalog_request else "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'"
        if catalog_request
        else "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'"
    )
    record_audit(request, response, "allowed" if response.status_code < 400 else "denied", "success" if response.status_code < 400 else "error")
    return response
