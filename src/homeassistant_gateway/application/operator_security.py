from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

OPERATOR_CAPABILITIES = frozenset(
    {
        "ha.write.services",
        "ha.write.automations",
        "ha.write.configuration",
    }
)

OPERATOR_OPERATIONS = frozenset(
    {
        "ha.call_service",
        "ha.update_automation",
        "ha.update_config",
    }
)


def fingerprint(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()
    return hashlib.sha256(encoded).hexdigest()


@dataclass(frozen=True)
class ApprovalGrant:
    approval_id: str
    operation: str
    target: str
    proposal_fingerprint: str
    expires_at: datetime
    # The token is returned only to the caller that requested approval.
    token: str = field(repr=False)


@dataclass
class _StoredGrant:
    grant: ApprovalGrant
    token_digest: str
    consumed: bool = False


class ApprovalStore(Protocol):
    def save(self, record: _StoredGrant) -> None: ...

    def get(self, approval_id: str) -> _StoredGrant | None: ...

    def mark_consumed(self, approval_id: str) -> None: ...

    def purge(self, now: datetime) -> None: ...

    def size(self) -> int: ...


class IdempotencyStore(Protocol):
    def find(self, key: str) -> str | None: ...

    def put(self, key: str, proposal_fingerprint: str) -> None: ...

    def size(self) -> int: ...


class _MemoryApprovalStore:
    def __init__(self) -> None:
        self.records: dict[str, _StoredGrant] = {}

    def save(self, record: _StoredGrant) -> None:
        self.records[record.grant.approval_id] = record

    def get(self, approval_id: str) -> _StoredGrant | None:
        return self.records.get(approval_id)

    def mark_consumed(self, approval_id: str) -> None:
        record = self.records[approval_id]
        record.consumed = True

    def purge(self, now: datetime) -> None:
        self.records = {key: record for key, record in self.records.items() if record.grant.expires_at > now and not record.consumed}

    def size(self) -> int:
        return len(self.records)


class _MemoryIdempotencyStore:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    def find(self, key: str) -> str | None:
        return self.values.get(key)

    def put(self, key: str, proposal_fingerprint: str) -> None:
        self.values[key] = proposal_fingerprint

    def size(self) -> int:
        return len(self.values)


class ApprovalService:
    """Issue and consume bounded, one-time approval grants in process memory."""

    def __init__(self, clock: Callable[[], datetime] | None = None, ttl_seconds: int = 60, max_grants: int = 256, store: ApprovalStore | None = None) -> None:
        if ttl_seconds < 1 or ttl_seconds > 900:
            raise ValueError("invalid_approval_ttl")
        if max_grants < 1 or max_grants > 10000:
            raise ValueError("invalid_approval_capacity")
        self._clock = clock or (lambda: datetime.now(UTC))
        self._ttl = timedelta(seconds=ttl_seconds)
        self._max_grants = max_grants
        self._store = store or _MemoryApprovalStore()

    def issue(self, operation: str, target: str, proposal: Any) -> ApprovalGrant:
        self._purge()
        if operation not in OPERATOR_OPERATIONS or not target:
            raise ValueError("approval_request_not_allowlisted")
        if self._store.size() >= self._max_grants:
            raise RuntimeError("approval_capacity_reached")
        token = secrets.token_urlsafe(32)
        grant = ApprovalGrant(
            approval_id=secrets.token_hex(16),
            operation=operation,
            target=target,
            proposal_fingerprint=fingerprint(proposal),
            expires_at=self._clock() + self._ttl,
            token=token,
        )
        self._store.save(_StoredGrant(grant, _digest(token)))
        return grant

    def consume(self, approval_id: str, token: str, operation: str, target: str, proposal: Any) -> ApprovalGrant:
        self._purge()
        stored = self._store.get(approval_id)
        if stored is None:
            raise ValueError("approval_not_found_or_expired")
        if stored.consumed or not hmac.compare_digest(stored.token_digest, _digest(token)):
            raise ValueError("approval_invalid_or_replayed")
        grant = stored.grant
        if grant.operation != operation or grant.target != target or grant.proposal_fingerprint != fingerprint(proposal):
            raise ValueError("approval_proposal_mismatch")
        self._store.mark_consumed(approval_id)
        return grant

    def _purge(self) -> None:
        now = self._clock()
        self._store.purge(now)


class OperatorControl:
    """Emergency kill switch shared by all operator execution paths."""

    def __init__(self, enabled: bool = False) -> None:
        self._enabled = enabled

    @property
    def enabled(self) -> bool:
        return self._enabled

    def disable(self) -> None:
        self._enabled = False

    def enable(self) -> None:
        self._enabled = True

    def require_enabled(self) -> None:
        if not self._enabled:
            raise PermissionError("operator_disabled")


class IdempotencyRegistry:
    """Bounded process-local reservation registry for mutation replay protection."""

    def __init__(self, max_entries: int = 1024, store: IdempotencyStore | None = None) -> None:
        if max_entries < 1 or max_entries > 10000:
            raise ValueError("invalid_idempotency_capacity")
        self._max_entries = max_entries
        self._store = store or _MemoryIdempotencyStore()

    def reserve(self, key: str, proposal: Any) -> None:
        if not key or len(key) > 128:
            raise ValueError("idempotency_key_required")
        proposed = fingerprint(proposal)
        existing = self._store.find(key)
        if existing is not None and existing != proposed:
            raise ValueError("idempotency_key_payload_mismatch")
        if existing is not None:
            raise ValueError("idempotency_key_replayed")
        if self._store.size() >= self._max_entries:
            raise RuntimeError("idempotency_capacity_reached")
        self._store.put(key, proposed)


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
