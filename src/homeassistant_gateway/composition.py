from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI

from homeassistant_gateway.application.authentication import AuthenticateClient
from homeassistant_gateway.application.authorization import AuthorizeRequest
from homeassistant_gateway.application.clients import (
    DeleteClient,
    IssueClient,
    ListClients,
    RevokeClient,
    RotateClient,
)
from homeassistant_gateway.application.development import DevelopmentToolRunner
from homeassistant_gateway.application.observer import ObserverDiagnostics
from homeassistant_gateway.application.operator_mutations import OperatorMutationService
from homeassistant_gateway.application.operator_security import (
    ApprovalService,
    IdempotencyRegistry,
    OperatorControl,
)
from homeassistant_gateway.domain.policy import Profile
from homeassistant_gateway.infrastructure.home_assistant.service_mutation import (
    SupervisorOperatorMutationAdapter,
    SupervisorServiceMutationAdapter,
)
from homeassistant_gateway.infrastructure.local_port_diagnostics import LocalGatewayPortDiagnostics
from homeassistant_gateway.infrastructure.security.tokens import SecureTokenIssuer
from homeassistant_gateway.infrastructure.storage.sqlite_audit import SQLiteAuditRepository
from homeassistant_gateway.infrastructure.storage.sqlite_clients import SQLiteClientRepository
from homeassistant_gateway.infrastructure.storage.sqlite_development import (
    SQLiteDevelopmentReportStore,
)
from homeassistant_gateway.infrastructure.storage.sqlite_operator import (
    SQLiteOperatorAuditAdapter,
    SQLiteOperatorStateRepository,
)
from homeassistant_gateway.infrastructure.supervisor_home_assistant import (
    SupervisorHomeAssistantClient,
)
from homeassistant_gateway.presentation.http import create_app
from homeassistant_gateway.presentation.mcp import create_mcp_app


@dataclass(frozen=True)
class AppSettings:
    data_dir: Path
    operator_enabled: bool = False
    supervisor_token: str | None = None
    supervisor_url: str = "http://supervisor/core/api"
    operator_allowed_services: tuple[str, ...] = ()
    development_console_enabled: bool = True
    mcp_allowed_hosts: tuple[str, ...] = (
        "localhost",
        "127.0.0.1",
        "[::1]",
        "homeassistant",
        "homeassistant.local",
    )


def build_app(settings: AppSettings) -> FastAPI:
    """Construct the application graph without reading process-global configuration."""
    database = settings.data_dir / "gateway.sqlite3"
    repository = SQLiteClientRepository(database)
    audit_repository = SQLiteAuditRepository(database)
    development_report_store = SQLiteDevelopmentReportStore(database)
    operator_state = SQLiteOperatorStateRepository(database)
    if not operator_state.get_allowed_services() and settings.operator_allowed_services:
        operator_state.set_allowed_services(tuple(sorted(set(settings.operator_allowed_services))))
    token_issuer = SecureTokenIssuer()
    clock = lambda: datetime.now(UTC)

    authenticate_client = AuthenticateClient(repository, token_issuer)
    authorize_request = AuthorizeRequest(repository, settings.operator_enabled)
    observer_diagnostics = ObserverDiagnostics(authenticate_client, authorize_request)
    home_assistant = (
        SupervisorHomeAssistantClient(settings.supervisor_token, base_url=settings.supervisor_url)
        if settings.supervisor_token
        else None
    )
    def operator_services_ceiling() -> tuple[str, ...]:
        return operator_state.get_allowed_services()

    def effective_client_services() -> tuple[str, ...]:
        ceiling = set(operator_services_ceiling())
        return tuple(sorted({service for client in repository.list() if client.profile is Profile.OPERATOR and client.status.value == "active" for service in client.operator_services if service in ceiling}))

    mutation_port = None
    if settings.operator_enabled and home_assistant is not None:
        service_port = SupervisorServiceMutationAdapter(
            home_assistant,
            effective_client_services,
        )
        mutation_port = SupervisorOperatorMutationAdapter(service_port)
    operator_mutations = OperatorMutationService(
        OperatorControl(settings.operator_enabled),
        ApprovalService(clock=clock, store=operator_state),
        IdempotencyRegistry(store=operator_state),
        mutation_port=mutation_port,
        audit=SQLiteOperatorAuditAdapter(audit_repository, clock),
    )
    mcp_bundle = create_mcp_app(
        observer_diagnostics,
        authenticate_client.execute,
        authorize_request.execute,
        home_assistant=home_assistant,
        operator_mutations=operator_mutations,
        operator_services_ceiling=operator_services_ceiling,
        allowed_hosts=settings.mcp_allowed_hosts,
    )

    def operator_capabilities() -> tuple[str, ...]:
        current = effective_client_services()
        return tuple(
            capability
            for capability, services in (
                ("ha.write.services", tuple(service for service in current if not service.startswith("automation."))),
                ("ha.write.automations", tuple(service for service in current if service.startswith("automation."))),
            )
            if settings.operator_enabled and services
        )

    def registered_mutation_tools() -> tuple[str, ...]:
        current = effective_client_services()
        return tuple(
            tool
            for tools, services in (
                (("ha_request_service_approval", "ha_execute_service_call"), tuple(service for service in current if not service.startswith("automation."))),
                (("ha_request_automation_approval", "ha_execute_automation"), tuple(service for service in current if service.startswith("automation."))),
            )
            if settings.operator_enabled and services
            for tool in tools
        )

    return create_app(
        issue_client=IssueClient(
            repository=repository,
            token_issuer=token_issuer,
            clock=clock,
            operator_enabled=settings.operator_enabled,
        ),
        list_clients=ListClients(repository),
        revoke_client=RevokeClient(repository, clock),
        delete_client=DeleteClient(repository),
        rotate_client=RotateClient(repository, token_issuer),
        authenticate_client=authenticate_client,
        authorize_request=authorize_request,
        audit_sink=audit_repository,
        audit_reader=audit_repository,
        mcp_app=mcp_bundle.application,
        home_assistant=home_assistant,
        development_runner=DevelopmentToolRunner(home_assistant, LocalGatewayPortDiagnostics()) if home_assistant else None,
        development_report_store=development_report_store,
        development_console_enabled=settings.development_console_enabled,
        operator_enabled=settings.operator_enabled,
        operator_mutations=operator_mutations,
        operator_service_policy=operator_state,
        operator_services_ceiling=operator_services_ceiling,
        operator_capabilities=operator_capabilities,
        registered_mutation_tools=registered_mutation_tools,
        lifespan=mcp_bundle.lifespan,
    )
