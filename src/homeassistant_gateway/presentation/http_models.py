from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from homeassistant_gateway.application.audit import AuditEvent
from homeassistant_gateway.domain.clients import Client
from homeassistant_gateway.domain.policy import Decision, Profile


class HealthResponse(BaseModel):
    status: str


class ReadinessResponse(BaseModel):
    status: str
    storage: str
    mcp: str
    home_assistant: str


class CreateClientRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=256)
    profile: Profile
    capabilities: frozenset[str] = Field(default_factory=frozenset)


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: str
    display_name: str
    profile: Profile
    capabilities: frozenset[str]
    created_at: datetime
    status: str
    revoked_at: datetime | None

    @classmethod
    def from_domain(cls, client: Client) -> ClientResponse:
        return cls(
            client_id=client.client_id,
            display_name=client.display_name,
            profile=client.profile,
            capabilities=client.capabilities,
            created_at=client.created_at,
            status=client.status.value,
            revoked_at=client.revoked_at,
        )


class IssuedClientResponse(ClientResponse):
    token: str


class EvaluatePolicyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: str = Field(min_length=1, max_length=128)
    capability: str = Field(min_length=1, max_length=128)
    mutation: bool = False


class PolicyDecisionResponse(BaseModel):
    decision: Decision
    reason: str


class AuditEventResponse(BaseModel):
    event_id: str
    occurred_at: datetime
    request_id: str
    remote_user_id: str | None
    action: str
    target: str
    decision: str
    outcome: str
    status_code: int

    @classmethod
    def from_domain(cls, event: AuditEvent) -> AuditEventResponse:
        return cls.model_validate(event, from_attributes=True)


class DevelopmentOperationResponse(BaseModel):
    name: str
    label: str
    description: str
    kind: str
    supports_entity_id: bool
    supports_start_time: bool


class DevelopmentRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operation: str = Field(min_length=1, max_length=64)
    parameters: dict[str, str] = Field(default_factory=dict)


class OperatorPreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operation: str = Field(min_length=1, max_length=128)
    target: str = Field(min_length=1, max_length=256)
    capability: str = Field(min_length=1, max_length=128)
    proposed: dict[str, Any] = Field(default_factory=dict)
    current: dict[str, Any] = Field(default_factory=dict)


class OperatorApprovalRequest(OperatorPreviewRequest):
    pass


class OperatorExecuteRequest(OperatorPreviewRequest):
    approval_id: str = Field(min_length=1, max_length=128)
    approval_token: str = Field(min_length=1, max_length=256)
    idempotency_key: str = Field(min_length=1, max_length=128)


class DevelopmentResultResponse(BaseModel):
    status: str
    operation: str
    duration_ms: int
    count: int
    data: Any = None
    reason: str | None = None


class MCPDiscoveryResponse(BaseModel):
    server_name: str
    transport: str
    endpoint: str
    client_id: str
    profile: Profile
    capabilities: frozenset[str]
    tools: tuple[str, ...]
