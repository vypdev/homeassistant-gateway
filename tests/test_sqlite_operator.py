from datetime import UTC, datetime

from homeassistant_gateway.application.operator_security import ApprovalService, IdempotencyRegistry
from homeassistant_gateway.infrastructure.storage.sqlite_operator import (
    SQLiteOperatorStateRepository,
)


def test_sqlite_operator_state_preserves_approval_digest_and_replay_state(tmp_path) -> None:
    repository = SQLiteOperatorStateRepository(tmp_path / "gateway.sqlite3")
    now = datetime(2026, 8, 3, tzinfo=UTC)
    approvals = ApprovalService(lambda: now, store=repository)
    grant = approvals.issue("ha.call_service", "light.test", {"state": "on"})
    approvals.consume(grant.approval_id, grant.token, "ha.call_service", "light.test", {"state": "on"})

    reopened = SQLiteOperatorStateRepository(tmp_path / "gateway.sqlite3")
    assert reopened.get(grant.approval_id) is not None

    idempotency = IdempotencyRegistry(store=reopened)
    idempotency.reserve("request-1", {"target": "light.test"})
    reopened_idempotency = IdempotencyRegistry(store=SQLiteOperatorStateRepository(tmp_path / "gateway.sqlite3"))
    assert reopened_idempotency._store.find("request-1") is not None
