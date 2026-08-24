from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from urllib.parse import urlsplit, urlunsplit


class HomeAssistantConnectionMode(StrEnum):
    SUPERVISOR = "supervisor"
    STANDALONE = "standalone"


@dataclass(frozen=True)
class HomeAssistantConnection:
    mode: HomeAssistantConnectionMode
    rest_api_url: str
    websocket_url: str
    token: str

    def __repr__(self) -> str:
        return (
            "HomeAssistantConnection("
            f"mode={self.mode.value!r}, "
            f"rest_api_url={self.rest_api_url!r}, "
            f"websocket_url={self.websocket_url!r}, "
            "token='[REDACTED]')"
        )


def resolve_home_assistant_connection(
    mode: HomeAssistantConnectionMode | str,
    url: str,
    token: str,
) -> HomeAssistantConnection:
    """Resolve one explicit Home Assistant connection without implicit fallback."""
    try:
        connection_mode = HomeAssistantConnectionMode(mode)
    except ValueError as error:
        raise ValueError("invalid_home_assistant_mode") from error
    if not token:
        raise ValueError("home_assistant_token_required")
    if not url:
        raise ValueError("home_assistant_url_required")

    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("invalid_home_assistant_url")
    if parsed.username or parsed.password:
        raise ValueError("home_assistant_url_credentials_forbidden")
    if parsed.query or parsed.fragment:
        raise ValueError("home_assistant_url_query_forbidden")

    path = parsed.path.rstrip("/")
    if connection_mode is HomeAssistantConnectionMode.SUPERVISOR:
        if not path.endswith("/core/api"):
            raise ValueError("invalid_supervisor_api_url")
        rest_path = path
        websocket_path = path.removesuffix("/api") + "/websocket"
    else:
        if path.endswith("/core/api"):
            raise ValueError("standalone_supervisor_url_forbidden")
        if path.endswith("/api"):
            rest_path = path
        elif path:
            raise ValueError("invalid_standalone_api_url")
        else:
            rest_path = "/api"
        websocket_path = "/api/websocket"

    rest_url = urlunsplit((parsed.scheme, parsed.netloc, rest_path, "", ""))
    websocket_scheme = "wss" if parsed.scheme == "https" else "ws"
    websocket_url = urlunsplit((websocket_scheme, parsed.netloc, websocket_path, "", ""))
    return HomeAssistantConnection(connection_mode, rest_url, websocket_url, token)
