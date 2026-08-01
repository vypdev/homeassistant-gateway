from collections.abc import Mapping
from typing import Any, Protocol, TypedDict


class HomeAssistantUnavailable(RuntimeError):
    """The Home Assistant upstream could not be reached or returned an error."""


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
