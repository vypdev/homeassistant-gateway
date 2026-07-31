from datetime import UTC, datetime

from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Profile
from homeassistant_gateway.infrastructure.storage.sqlite_clients import SQLiteClientRepository


def make_client() -> Client:
    return Client(
        client_id="openclaw-observer",
        display_name="OpenClaw observer",
        profile=Profile.OBSERVER,
        capabilities=frozenset({"ha.read.states", "ha.read.entities"}),
        created_at=datetime(2026, 7, 31, tzinfo=UTC),
        status=ClientStatus.ACTIVE,
        token_digest="digest-only",
    )


def test_sqlite_repository_persists_client_across_instances(tmp_path) -> None:
    database = tmp_path / "gateway.sqlite3"
    repository = SQLiteClientRepository(database)
    client = make_client()
    repository.save(client)

    reopened = SQLiteClientRepository(database)
    loaded = reopened.get(client.client_id)

    assert loaded == client
    assert reopened.list() == [client]


def test_sqlite_repository_updates_revocation_without_plaintext_token(tmp_path) -> None:
    database = tmp_path / "gateway.sqlite3"
    repository = SQLiteClientRepository(database)
    client = make_client()
    repository.save(client)
    client.status = ClientStatus.REVOKED
    client.revoked_at = datetime(2026, 7, 31, 12, 0, tzinfo=UTC)
    repository.save(client)

    loaded = SQLiteClientRepository(database).get(client.client_id)

    assert loaded is not None
    assert loaded.status is ClientStatus.REVOKED
    assert loaded.revoked_at == client.revoked_at
    assert not hasattr(loaded, "token")
