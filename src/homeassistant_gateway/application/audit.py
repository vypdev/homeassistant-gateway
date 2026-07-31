from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class AuditEvent:
    event_id: str
    occurred_at: datetime
    request_id: str
    remote_user_id: str | None
    action: str
    target: str
    decision: str
    outcome: str
    status_code: int


class AuditSink(Protocol):
    def record(self, event: AuditEvent) -> None: ...


class NoopAuditSink:
    def record(self, event: AuditEvent) -> None:
        del event
