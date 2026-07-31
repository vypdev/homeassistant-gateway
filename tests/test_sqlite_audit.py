from datetime import UTC, datetime

from homeassistant_gateway.application.audit import AuditEvent
from homeassistant_gateway.infrastructure.storage.sqlite_audit import SQLiteAuditRepository


def test_sqlite_audit_repository_persists_sanitized_event(tmp_path) -> None:
    database = tmp_path / "gateway.sqlite3"
    repository = SQLiteAuditRepository(database)
    event = AuditEvent(
        event_id="event-1",
        occurred_at=datetime(2026, 7, 31, tzinfo=UTC),
        request_id="request-1",
        remote_user_id="user-1",
        action="http.get",
        target="/api/clients",
        decision="allowed",
        outcome="success",
        status_code=200,
    )

    repository.record(event)
    loaded = SQLiteAuditRepository(database).list()

    assert loaded == [event]
    assert not hasattr(loaded[0], "payload")
