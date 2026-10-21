from datetime import UTC, datetime

from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.capability_probe import ProbeCapabilities
from homeassistant_gateway.application.home_assistant import HomeAssistantHealth
from homeassistant_gateway.domain.clients import Client, ClientStatus
from homeassistant_gateway.domain.policy import Profile


class Repository:
    def __init__(self, client: Client | None) -> None:
        self.client = client

    def get(self, client_id: str) -> Client | None:
        return self.client if self.client and self.client.client_id == client_id else None


class HomeAssistant:
    def health(self): return True
    def ui_context(self): return {"language": "en", "theme": "auto"}

    def automations(self):
        return [{"entity_id": "automation.sample", "state": "on"}]

    def automation_config(self, entity_id=None):
        return {"id": entity_id, "trigger": [], "action": []}

    def health_details(self) -> HomeAssistantHealth: return {"status": "ok", "checks": []}
    def inventory(self): return {"entities": []}
    def states(self, entity_id=None): return []
    def configuration(self): return {"core": {"version": "test"}}
    def services(self): return []
    def events(self): return []
    def history(self, entity_id=None, start_time=None): return []
    def logbook(self, entity_id=None, start_time=None): return []
    def extended_read(self, resource): return []


def client(capabilities: set[str], profile: Profile = Profile.OBSERVER) -> Client:
    return Client(
        client_id="probe-client",
        display_name="Probe client",
        profile=profile,
        capabilities=frozenset(capabilities),
        created_at=datetime.now(UTC),
        status=ClientStatus.ACTIVE,
        token_digest="digest",
    )


def test_read_automation_config_probe_executes_bounded_read() -> None:
    repository = Repository(client({"ha.read.automation_config"}))
    use_case = ProbeCapabilities(repository, AuthorizeRequest(repository, operator_enabled=False), HomeAssistant())

    report = use_case.execute("probe-client")
    result = next(item for item in report.results if item.capability == "ha.read.automation_config")

    assert result.status == "ok"
    assert result.tool == "ha_automation_config"
    assert result.sample_entity_id == "automation.sample"
    assert result.details == {"shape": "object", "keys": ["action", "id", "trigger"]}


def test_missing_read_capability_is_denied_without_upstream_read() -> None:
    repository = Repository(client(set()))
    use_case = ProbeCapabilities(repository, AuthorizeRequest(repository, operator_enabled=False), HomeAssistant())

    result = next(item for item in use_case.execute("probe-client").results if item.capability == "ha.read.automation_config")

    assert result.status == "denied"
    assert result.reason == "capability_not_granted"


def test_configuration_write_probe_never_executes_mutation() -> None:
    repository = Repository(client({"ha.write.configuration"}, Profile.OPERATOR))
    use_case = ProbeCapabilities(repository, AuthorizeRequest(repository, operator_enabled=True), HomeAssistant())

    result = next(item for item in use_case.execute("probe-client").results if item.capability == "ha.write.configuration")

    assert result.status == "unsupported"
    assert result.reason == "tool_not_registered"
    assert result.tool is None


def test_write_service_probe_only_reports_approval_required() -> None:
    repository = Repository(client({"ha.write.services"}, Profile.OPERATOR))
    use_case = ProbeCapabilities(repository, AuthorizeRequest(repository, operator_enabled=True), HomeAssistant())

    result = next(item for item in use_case.execute("probe-client").results if item.capability == "ha.write.services")

    assert result.status == "approval_required"
    assert result.reason == "no_mutation_executed"
