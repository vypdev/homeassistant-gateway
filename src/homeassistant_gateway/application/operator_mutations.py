from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from homeassistant_gateway.application.operator_security import (
    OPERATOR_CAPABILITIES,
    OPERATOR_OPERATIONS,
    ApprovalGrant,
    ApprovalService,
    IdempotencyRegistry,
    OperatorControl,
)


class OperatorMutationPort(Protocol):
    def execute(self, operation: str, target: str, proposed: dict[str, Any]) -> dict[str, Any]: ...


class OperatorAuditPort(Protocol):
    def record(self, operation: str, target: str, decision: str, outcome: str) -> None: ...


@dataclass(frozen=True)
class MutationPreview:
    operation: str
    target: str
    capability: str
    decision: str
    execution: str
    before: dict[str, Any]
    after: dict[str, Any]
    affected: tuple[str, ...]
    approval_required: bool
    idempotency_required: bool
    rollback_required: bool
    reason: str


class OperatorMutationService:
    """Prepare or execute a narrowly validated mutation through an injected port."""

    def __init__(
        self,
        control: OperatorControl,
        approvals: ApprovalService,
        idempotency: IdempotencyRegistry,
        mutation_port: OperatorMutationPort | None = None,
        audit: OperatorAuditPort | None = None,
    ) -> None:
        self._control = control
        self._approvals = approvals
        self._idempotency = idempotency
        self._mutation_port = mutation_port
        self._audit = audit

    def preview(
        self,
        operation: str,
        target: str,
        capability: str,
        proposed: dict[str, Any],
        current: dict[str, Any] | None = None,
    ) -> MutationPreview:
        self._validate(operation, target, capability, proposed)
        before = dict(current or {})
        after = {**before, **proposed}
        return MutationPreview(
            operation=operation,
            target=target,
            capability=capability,
            decision="approval_required",
            execution="disabled" if not self._control.enabled else "not_configured",
            before=before,
            after=after,
            affected=(target,),
            approval_required=True,
            idempotency_required=True,
            rollback_required=True,
            reason="operator_mutations_not_enabled" if not self._control.enabled else "mutation_adapter_not_configured",
        )

    def request_approval(self, operation: str, target: str, capability: str, proposed: dict[str, Any]) -> ApprovalGrant:
        self._validate(operation, target, capability, proposed)
        return self._approvals.issue(operation, target, proposed)

    def execute(
        self,
        operation: str,
        target: str,
        capability: str,
        proposed: dict[str, Any],
        approval_id: str,
        approval_token: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        self._validate(operation, target, capability, proposed)
        if not self._control.enabled:
            self._record(operation, target, "denied", "operator_disabled")
            raise PermissionError("operator_disabled")
        self._idempotency.reserve(idempotency_key, {"operation": operation, "target": target, "proposed": proposed})
        self._approvals.consume(approval_id, approval_token, operation, target, proposed)
        if self._mutation_port is None:
            self._record(operation, target, "unsupported", "mutation_adapter_not_configured")
            return {"status": "unsupported", "reason": "mutation_adapter_not_configured", "execution": "disabled"}
        result = self._mutation_port.execute(operation, target, proposed)
        self._record(operation, target, "allowed", str(result.get("status", "unknown")))
        return result

    def _record(self, operation: str, target: str, decision: str, outcome: str) -> None:
        if self._audit is not None:
            self._audit.record(operation, target, decision, outcome)

    @staticmethod
    def _validate(operation: str, target: str, capability: str, proposed: dict[str, Any]) -> None:
        if operation not in OPERATOR_OPERATIONS:
            raise ValueError("operator_operation_not_allowlisted")
        if capability not in OPERATOR_CAPABILITIES:
            raise ValueError("operator_capability_not_allowlisted")
        expected = {
            "ha.call_service": "ha.write.services",
            "ha.update_automation": "ha.write.automations",
            "ha.update_config": "ha.write.configuration",
        }[operation]
        if capability != expected:
            raise ValueError("operator_capability_mismatch")
        if not target or len(target) > 256:
            raise ValueError("operator_target_invalid")
        if not isinstance(proposed, dict) or len(proposed) > 50:
            raise ValueError("operator_payload_invalid")
        sensitive = ("token", "password", "secret", "cookie", "authorization", "api_key")
        if any(any(marker in str(key).lower() for marker in sensitive) for key in proposed):
            raise ValueError("operator_secret_field_forbidden")
