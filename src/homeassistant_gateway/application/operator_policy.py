from __future__ import annotations

import re
from typing import Any, Protocol


class OperatorServicePolicyPort(Protocol):
    def get_allowed_services(self) -> tuple[str, ...]: ...

    def set_allowed_services(self, services: tuple[str, ...]) -> None: ...


def normalize_service_catalog(raw: Any, max_services: int = 500) -> list[dict[str, Any]]:
    """Normalize Home Assistant's service catalog into bounded GUI records."""
    records: list[dict[str, Any]] = []
    if isinstance(raw, list):
        domains = ((item.get("domain"), item.get("services")) for item in raw if isinstance(item, dict))
    elif isinstance(raw, dict):
        domains = raw.items()
    else:
        return records
    for domain, services in domains:
        if not isinstance(domain, str) or not re.fullmatch(r"[a-z0-9_]+", domain) or not isinstance(services, dict):
            continue
        for service, definition in services.items():
            if len(records) >= max_services or not isinstance(service, str) or not re.fullmatch(r"[a-z0-9_]+", service):
                continue
            detail = definition if isinstance(definition, dict) else {}
            records.append(
                {
                    "id": f"{domain}.{service}",
                    "domain": domain,
                    "service": service,
                    "name": detail.get("name") or service.replace("_", " ").title(),
                    "description": detail.get("description") or f"Call the Home Assistant {domain}.{service} service.",
                    "fields": detail.get("fields") if isinstance(detail.get("fields"), dict) else {},
                }
            )
    return records
