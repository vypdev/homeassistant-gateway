from dataclasses import dataclass
from datetime import UTC, datetime

import pytest

from homeassistant_gateway.application.clients import (
    DeleteClient,
    IssueClient,
    ListClients,
    RevokeClient,
    RotateClient,
    UpdateClientOperatorServices,
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

    def delete(self, client_id: str) -> None:
        self.items.pop(client_id, None)


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
            capabilities=frozenset({"ha.write.services"}),
        )


def test_observer_cannot_receive_write_capability() -> None:
    use_case = IssueClient(InMemoryClientRepository(), FakeTokenIssuer(), lambda: datetime.now(UTC), operator_enabled=True)

    with pytest.raises(ValueError, match="observer_operator_capability_conflict"):
        use_case.execute(
            client_id="observer",
            display_name="Observer",
            profile=Profile.OBSERVER,
            capabilities=frozenset({"ha.write.services"}),
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


def test_delete_client_removes_revoked_client_only() -> None:
    repository = InMemoryClientRepository()
    issue = IssueClient(repository, FakeTokenIssuer(), lambda: datetime.now(UTC), False)
    issue.execute("client", "Client", Profile.OBSERVER, frozenset({"ha.read.states"}))
    revoke = RevokeClient(repository, lambda: datetime.now(UTC))
    revoke.execute("client")

    DeleteClient(repository).execute("client")

    assert repository.get("client") is None


def test_delete_client_rejects_active_client_until_token_is_revoked() -> None:
    repository = InMemoryClientRepository()
    issue = IssueClient(repository, FakeTokenIssuer(), lambda: datetime.now(UTC), False)
    issue.execute("client", "Client", Profile.OBSERVER, frozenset({"ha.read.states"}))

    with pytest.raises(ValueError, match="client_must_be_revoked"):
        DeleteClient(repository).execute("client")


def test_operator_grants_are_explicit_and_can_be_updated() -> None:
    repository = InMemoryClientRepository()
    use_case = IssueClient(repository, FakeTokenIssuer(), lambda: datetime.now(UTC), operator_enabled=True)
    result = use_case.execute(
        client_id="hermes",
        display_name="Hermes",
        profile=Profile.OPERATOR,
        capabilities=frozenset({"ha.write.services"}),
        operator_services=frozenset({"light.turn_on"}),
    )
    assert result.client.operator_services == frozenset({"light.turn_on"})
    updated = UpdateClientOperatorServices(repository).execute("hermes", frozenset({"switch.turn_off"}))
    assert updated.operator_services == frozenset({"switch.turn_off"})


def test_observer_cannot_receive_operator_service_grants() -> None:
    use_case = IssueClient(InMemoryClientRepository(), FakeTokenIssuer(), lambda: datetime.now(UTC), operator_enabled=True)
    with pytest.raises(ValueError, match="observer_operator_capability_conflict"):
        use_case.execute(
            client_id="observer-services",
            display_name="Observer",
            profile=Profile.OBSERVER,
            capabilities=frozenset({"ha.read.states"}),
            operator_services=frozenset({"light.turn_on"}),
        )


def test_operator_service_update_rejects_missing_or_observer_clients() -> None:
    repository = InMemoryClientRepository()
    updater = UpdateClientOperatorServices(repository)
    with pytest.raises(ValueError, match="client_not_found"):
        updater.execute("missing", frozenset({"light.turn_on"}))
    issue = IssueClient(repository, FakeTokenIssuer(), lambda: datetime.now(UTC), operator_enabled=True)
    issue.execute("observer", "Observer", Profile.OBSERVER, frozenset({"ha.read.states"}))
    with pytest.raises(ValueError, match="operator_services_require_operator_profile"):
        updater.execute("observer", frozenset({"light.turn_on"}))


def test_client_identity_and_rotation_rejections_are_explicit() -> None:
    repository = InMemoryClientRepository()
    issue = IssueClient(repository, FakeTokenIssuer(), lambda: datetime.now(UTC), operator_enabled=False)
    with pytest.raises(ValueError, match="client_identity_required"):
        issue.execute("", "", Profile.OBSERVER, frozenset())
    with pytest.raises(ValueError, match="client_not_active"):
        RotateClient(repository, FakeTokenIssuer()).execute("missing")
