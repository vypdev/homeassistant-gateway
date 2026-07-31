from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .policy import Profile


class ClientStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"


@dataclass
class Client:
    client_id: str
    display_name: str
    profile: Profile
    capabilities: frozenset[str]
    created_at: datetime
    status: ClientStatus
    token_digest: str = field(repr=False)
    revoked_at: datetime | None = None
