import sqlite3
import uuid
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from homeassistant_gateway.application.audit import AuditEvent
from homeassistant_gateway.application.operator_security import (
    ApprovalGrant,
    ApprovalStore,
    IdempotencyStore,
    _StoredGrant,
)
from homeassistant_gateway.infrastructure.storage.sqlite_audit import SQLiteAuditRepository

_SCHEMA = """
CREATE TABLE IF NOT EXISTS operator_approvals (
    approval_id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    target TEXT NOT NULL,
    proposal_fingerprint TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    token_digest TEXT NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS operator_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    proposal_fingerprint TEXT NOT NULL
);
"""


class SQLiteOperatorStateRepository(ApprovalStore, IdempotencyStore):
    """Persistent operator state; stores digests and metadata, never plaintext approval tokens."""

    def __init__(self, database: Path) -> None:
        self._database = Path(database)
        self._database.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self._database.touch(mode=0o600, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(_SCHEMA)

    def save(self, record: _StoredGrant) -> None:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO operator_approvals VALUES (?, ?, ?, ?, ?, ?, 0)",
                (
                    record.grant.approval_id,
                    record.grant.operation,
                    record.grant.target,
                    record.grant.proposal_fingerprint,
                    record.grant.expires_at.isoformat(),
                    record.token_digest,
                ),
            )

    def get(self, approval_id: str) -> _StoredGrant | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM operator_approvals WHERE approval_id = ?", (approval_id,)).fetchone()
        if row is None:
            return None
        grant = ApprovalGrant(
            approval_id=row["approval_id"],
            operation=row["operation"],
            target=row["target"],
            proposal_fingerprint=row["proposal_fingerprint"],
            expires_at=datetime.fromisoformat(row["expires_at"]),
            token="[NOT_AVAILABLE]",
        )
        return _StoredGrant(grant, row["token_digest"], bool(row["consumed"]))

    def mark_consumed(self, approval_id: str) -> None:
        with self._connect() as connection:
            connection.execute("UPDATE operator_approvals SET consumed = 1 WHERE approval_id = ?", (approval_id,))

    def purge(self, now: datetime) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM operator_approvals WHERE consumed = 1 OR expires_at <= ?", (now.isoformat(),))

    def size(self) -> int:
        with self._connect() as connection:
            return int(connection.execute("SELECT COUNT(*) FROM operator_approvals WHERE consumed = 0", ()).fetchone()[0])

    def find(self, key: str) -> str | None:
        with self._connect() as connection:
            row = connection.execute("SELECT proposal_fingerprint FROM operator_idempotency WHERE idempotency_key = ?", (key,)).fetchone()
        return None if row is None else row[0]

    def put(self, key: str, proposal_fingerprint: str) -> None:
        with self._connect() as connection:
            connection.execute("INSERT INTO operator_idempotency VALUES (?, ?)", (key, proposal_fingerprint))

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database)
        connection.row_factory = sqlite3.Row
        return connection


class SQLiteOperatorAuditAdapter:
    def __init__(self, repository: SQLiteAuditRepository, clock: Callable[[], datetime]) -> None:
        self._repository = repository
        self._clock = clock

    def record(self, operation: str, target: str, decision: str, outcome: str) -> None:
        self._repository.record(
            AuditEvent(
                event_id=uuid.uuid4().hex,
                occurred_at=self._clock(),
                request_id="operator",
                remote_user_id=None,
                action=f"operator.{operation}",
                target=target,
                decision=decision,
                outcome=outcome,
                status_code=200 if decision == "allowed" else 403,
            )
        )
