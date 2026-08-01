from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class OperatorPreview:
    operation: str
    target: str
    capability: str
    decision: str
    execution: str
    affected: tuple[str, ...]
    before: dict[str, Any]
    after: dict[str, Any]
    reason: str
    approval_required: bool = True
    idempotency_required: bool = True
    rollback_required: bool = True
    validation: str = "valid"


def build_operator_preview(
    operation: str,
    target: str,
    capability: str,
    proposed: dict[str, Any],
    current: dict[str, Any] | None = None,
) -> OperatorPreview:
    if not operation or not target or not capability:
        raise ValueError("operator_preview_fields_required")
    if len(operation) > 128 or len(target) > 256 or len(capability) > 128:
        raise ValueError("operator_preview_field_too_long")
    if not isinstance(proposed, dict) or len(proposed) > 50:
        raise ValueError("operator_preview_invalid_proposed_state")
    sensitive_names = {"token", "password", "secret", "cookie", "authorization", "api_key"}
    if any(any(marker in str(key).lower() for marker in sensitive_names) for key in [*proposed, *(current or {})]):
        raise ValueError("operator_preview_secret_field_forbidden")
    allowed_operations = {"ha.call_service": "ha.write.services", "ha.update_automation": "ha.write.automations", "ha.update_config": "ha.write.configuration"}
    if operation not in allowed_operations:
        raise ValueError("operator_preview_operation_not_allowlisted")
    if capability != allowed_operations[operation]:
        raise ValueError("operator_preview_capability_mismatch")
    before = dict(current or {})
    after = dict(before)
    after.update(proposed)
    return OperatorPreview(
        operation=operation,
        target=target,
        capability=capability,
        decision="approval_required",
        execution="disabled",
        affected=(target,),
        before=before,
        after=after,
        reason="operator_mutations_not_enabled",
    )
