import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path

from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Profile

_SCHEMA = """
CREATE TABLE IF NOT EXISTS clients (
    client_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    profile TEXT NOT NULL,
    capabilities_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL,
    token_digest TEXT NOT NULL,
    revoked_at TEXT,
    operator_services_json TEXT NOT NULL DEFAULT '[]')
"""


class SQLiteClientRepository:
    """SQLite adapter for client metadata; plaintext tokens never enter this store."""

    def __init__(self, database: Path) -> None:
        self._database = Path(database)
        self._database.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self._database.touch(mode=0o600, exist_ok=True)
        os.chmod(self._database, 0o600)
        with self._connect() as connection:
            connection.execute(_SCHEMA)
            columns = {row["name"] for row in connection.execute("PRAGMA table_info(clients)")}
            if "operator_services_json" not in columns:
                connection.execute("ALTER TABLE clients ADD COLUMN operator_services_json TEXT NOT NULL DEFAULT '[]'")

    def list(self) -> list[Client]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM clients ORDER BY created_at, client_id"
            ).fetchall()
        return [self._from_row(row) for row in rows]

    def get(self, client_id: str) -> Client | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM clients WHERE client_id = ?", (client_id,)
            ).fetchone()
        return self._from_row(row) if row is not None else None

    def find_by_token_digest(self, token_digest: str) -> Client | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM clients WHERE token_digest = ?", (token_digest,)
            ).fetchone()
        return self._from_row(row) if row is not None else None

    def save(self, client: Client) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO clients (
                    client_id, display_name, profile, capabilities_json,
                    created_at, status, token_digest, revoked_at, operator_services_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(client_id) DO UPDATE SET
                    display_name = excluded.display_name,
                    profile = excluded.profile,
                    capabilities_json = excluded.capabilities_json,
                    created_at = excluded.created_at,
                    status = excluded.status,
                    token_digest = excluded.token_digest,
                    revoked_at = excluded.revoked_at,
                    operator_services_json = excluded.operator_services_json
                """,
                (
                    client.client_id,
                    client.display_name,
                    client.profile.value,
                    json.dumps(sorted(client.capabilities), separators=(",", ":")),
                    client.created_at.isoformat(),
                    client.status.value,
                    client.token_digest,
                    client.revoked_at.isoformat() if client.revoked_at else None,
                    json.dumps(sorted(client.operator_services), separators=(",", ":")),
                ),
            )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _from_row(row: sqlite3.Row) -> Client:
        return Client(
            client_id=row["client_id"],
            display_name=row["display_name"],
            profile=Profile(row["profile"]),
            capabilities=frozenset(json.loads(row["capabilities_json"])),
            created_at=datetime.fromisoformat(row["created_at"]),
            status=ClientStatus(row["status"]),
            token_digest=row["token_digest"],
            revoked_at=(
                datetime.fromisoformat(row["revoked_at"])
                if row["revoked_at"] is not None
                else None
            ),
            operator_services=frozenset(json.loads(row["operator_services_json"] or "[]")),
        )
