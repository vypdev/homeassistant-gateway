from dataclasses import dataclass
from datetime import UTC, datetime

import pytest

from homeassistant_gateway.application.clients import (
    IssueClient,
    ListClients,
    RevokeClient,
)
from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Profile


@dataclass
class FakeTokenIssuer:
    issued: int = 0

    def issue(self) -> tuple[str, str]:
        self.issued += 1
        return (f"token-{self.issued}", f"digest-{self.issued}")


class InMemoryClientRepository:
    def __init__(self) -> None:
        self.items: dict[str, Client] = {}

    def list(self) -> list[Client]:
        return list(self.items.values())

    def get(self, client_id: str) -> Client | None:
        return self.items.get(client_id)

    def save(self, client: Client) -> None:
        self.items[client.client_id] = client


def test_issue_client_returns_token_once_and_persists_only_digest() -> None:
    repository = InMemoryClientRepository()
    tokens = FakeTokenIssuer()
    now = datetime(2026, 7, 31, tzinfo=UTC)
    use_case = IssueClient(repository, tokens, lambda: now, operator_enabled=False)

    result = use_case.execute(
        client_id="openclaw-observer",
        display_name="OpenClaw observer",
        profile=Profile.OBSERVER,
        capabilities=frozenset({"ha.read.states"}),
    )

    assert result.token == "token-1"
    assert result.client.token_digest == "digest-1"
    assert repository.get("openclaw-observer") is result.client


def test_operator_issue_is_rejected_when_disabled() -> None:
    use_case = IssueClient(
        InMemoryClientRepository(),
        FakeTokenIssuer(),
        lambda: datetime.now(UTC),
        operator_enabled=False,
    )

    with pytest.raises(ValueError, match="operator_disabled"):
        use_case.execute(
            client_id="operator",
            display_name="Operator",
            profile=Profile.OPERATOR,
            capabilities=frozenset({"ha.operator.service_call"}),
        )


def test_revoke_client_is_idempotent_and_listing_hides_token_digest() -> None:
    repository = InMemoryClientRepository()
    token_issuer = FakeTokenIssuer()
    issue = IssueClient(repository, token_issuer, lambda: datetime.now(UTC), False)
    issue.execute(
        client_id="client",
        display_name="Client",
        profile=Profile.OBSERVER,
        capabilities=frozenset({"ha.read.states"}),
    )

    revoke = RevokeClient(repository, lambda: datetime(2026, 7, 31, tzinfo=UTC))
    revoke.execute("client")
    revoke.execute("client")

    listed = ListClients(repository).execute()
    assert listed[0].status is ClientStatus.REVOKED
    assert not hasattr(listed[0], "token")
