import sqlite3
from datetime import datetime
from pathlib import Path

from homeassistant_gateway.application.audit import AuditEvent, AuditSink

_SCHEMA = """
CREATE TABLE IF NOT EXISTS audit_events (
    event_id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL,
    request_id TEXT NOT NULL,
    remote_user_id TEXT,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    decision TEXT NOT NULL,
    outcome TEXT NOT NULL,
    status_code INTEGER NOT NULL
)
"""


class SQLiteAuditRepository(AuditSink):
    """Persistent audit adapter that stores only the sanitized event contract."""

    def __init__(self, database: Path) -> None:
        self._database = Path(database)
        self._database.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self._database.touch(mode=0o600, exist_ok=True)
        with self._connect() as connection:
            connection.execute(_SCHEMA)

    def record(self, event: AuditEvent) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO audit_events (
                    event_id, occurred_at, request_id, remote_user_id,
                    action, target, decision, outcome, status_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.event_id,
                    event.occurred_at.isoformat(),
                    event.request_id,
                    event.remote_user_id,
                    event.action,
                    event.target,
                    event.decision,
                    event.outcome,
                    event.status_code,
                ),
            )

    def list(self, limit: int = 100) -> list[AuditEvent]:
        if limit < 1 or limit > 1000:
            raise ValueError("invalid_audit_limit")
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM audit_events ORDER BY occurred_at, event_id LIMIT ?",
                (limit,),
            ).fetchall()
        return [self._from_row(row) for row in rows]

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _from_row(row: sqlite3.Row) -> AuditEvent:
        return AuditEvent(
            event_id=row["event_id"],
            occurred_at=datetime.fromisoformat(row["occurred_at"]),
            request_id=row["request_id"],
            remote_user_id=row["remote_user_id"],
            action=row["action"],
            target=row["target"],
            decision=row["decision"],
            outcome=row["outcome"],
            status_code=row["status_code"],
        )
