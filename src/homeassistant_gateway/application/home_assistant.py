import json
from collections.abc import Mapping
from typing import Any, Protocol, TypedDict


class HomeAssistantUnavailable(RuntimeError):
    """The Home Assistant upstream could not be reached or returned an error."""

    def __init__(self, code: str, *, path: str | None = None, status: int | None = None, params: tuple[str, ...] = ()) -> None:
        self.code = code
        self.path = path
        self.status = status
        self.params = params
        context: dict[str, Any] = {"code": code}
        if status is not None:
            context["status"] = status
        if path is not None:
            context["path"] = path
        if params:
            context["params"] = list(params)
        super().__init__(json.dumps(context, sort_keys=True))


class HomeAssistantReadPort(Protocol):
    def health(self) -> bool: ...

    def inventory(self) -> dict[str, Any]: ...

    def states(self, entity_id: str | None = None) -> list[dict[str, Any]]: ...

    def automations(self) -> list[dict[str, Any]]: ...

    def configuration(self) -> dict[str, Any]: ...

    def services(self) -> list[dict[str, Any]]: ...

    def events(self) -> list[dict[str, Any]]: ...

    def history(self, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]: ...

    def logbook(self, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]: ...

    def extended_read(self, resource: str) -> list[dict[str, Any]]: ...

    def ui_context(self) -> dict[str, str]: ...


class ReadinessStatus(TypedDict):
    status: str
    detail: str


def redact(value: Any) -> Any:
    """Recursively remove secret-like fields before data crosses the application boundary."""
    secret_terms = ("token", "password", "secret", "cookie", "credential", "private_key")
    if isinstance(value, Mapping):
        return {
            str(key): "[REDACTED]" if any(term in str(key).lower() for term in secret_terms) else redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, tuple):
        return [redact(item) for item in value]
    return value
