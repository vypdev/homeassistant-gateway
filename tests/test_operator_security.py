from datetime import UTC, datetime, timedelta

import pytest

from homeassistant_gateway.application.operator_security import (
    ApprovalService,
    IdempotencyRegistry,
    OperatorControl,
    fingerprint,
)


def test_approval_is_single_use_and_token_is_not_in_repr() -> None:
    now = datetime(2026, 8, 3, tzinfo=UTC)
    service = ApprovalService(lambda: now)
    grant = service.issue("ha.call_service", "light.test", {"state": "on"})

    assert grant.token not in repr(grant)
    consumed = service.consume(grant.approval_id, grant.token, "ha.call_service", "light.test", {"state": "on"})
    assert consumed.approval_id == grant.approval_id
    with pytest.raises(ValueError, match="approval_not_found_or_expired|approval_invalid_or_replayed"):
        service.consume(grant.approval_id, grant.token, "ha.call_service", "light.test", {"state": "on"})


def test_approval_rejects_changed_proposal_and_expiry() -> None:
    now = datetime(2026, 8, 3, tzinfo=UTC)
    service = ApprovalService(lambda: now, ttl_seconds=1)
    grant = service.issue("ha.call_service", "light.test", {"state": "on"})
    with pytest.raises(ValueError, match="approval_proposal_mismatch"):
        service.consume(grant.approval_id, grant.token, "ha.call_service", "light.test", {"state": "off"})
    now += timedelta(seconds=2)
    with pytest.raises(ValueError, match="approval_not_found_or_expired"):
        service.consume(grant.approval_id, grant.token, "ha.call_service", "light.test", {"state": "on"})


def test_idempotency_rejects_replay_and_payload_reuse() -> None:
    registry = IdempotencyRegistry()
    registry.reserve("request-1", {"target": "light.test"})
    with pytest.raises(ValueError, match="idempotency_key_replayed"):
        registry.reserve("request-1", {"target": "light.test"})
    with pytest.raises(ValueError, match="idempotency_key_payload_mismatch"):
        registry.reserve("request-1", {"target": "switch.test"})


def test_control_is_disabled_by_default_and_can_be_emergency_disabled() -> None:
    control = OperatorControl()
    assert control.enabled is False
    with pytest.raises(PermissionError, match="operator_disabled"):
        control.require_enabled()
    control.enable()
    control.require_enabled()
    control.disable()
    with pytest.raises(PermissionError, match="operator_disabled"):
        control.require_enabled()


def test_fingerprint_is_deterministic_for_mapping_order() -> None:
    assert fingerprint({"a": 1, "b": 2}) == fingerprint({"b": 2, "a": 1})
