from __future__ import annotations

from typing import Any, Protocol


class DevelopmentJobSubmitPort(Protocol):
    def start(self, operation: str, parameters: dict[str, Any] | None = None) -> str: ...


class DevelopmentJobSnapshotPort(Protocol):
    def snapshot(self, job_id: str) -> dict[str, Any] | None: ...


class DevelopmentJobCancelPort(Protocol):
    def cancel(self, job_id: str) -> bool: ...


class DevelopmentJobCleanupPort(Protocol):
    def cleanup(self) -> None: ...


class DevelopmentJobLifecyclePort(Protocol):
    def shutdown(self) -> None: ...
