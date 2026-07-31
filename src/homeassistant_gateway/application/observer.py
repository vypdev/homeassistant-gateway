from dataclasses import dataclass

from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest


@dataclass(frozen=True)
class GatewayDiagnostics:
    status: str
    client_id: str
    profile: str
    capabilities: tuple[str, ...]


class ObserverDiagnostics:
    """Read-only application use case exposed by the first MCP observer tool."""

    def __init__(
        self,
        authenticate_client: AuthenticateClient,
        authorize_request: AuthorizeRequest,
    ) -> None:
        self._authenticate_client = authenticate_client
        self._authorize_request = authorize_request

    def execute(self, token: str) -> GatewayDiagnostics:
        client = self._authenticate_client.execute(token)
        if client is None:
            raise PermissionError("invalid_client_token")
        decision = self._authorize_request.execute(
            client.client_id,
            "ha.read.diagnostics",
            mutation=False,
        )
        if decision.decision.value != "allowed":
            raise PermissionError(decision.reason)
        return GatewayDiagnostics(
            status="ok",
            client_id=client.client_id,
            profile=client.profile.value,
            capabilities=tuple(sorted(client.capabilities)),
        )
