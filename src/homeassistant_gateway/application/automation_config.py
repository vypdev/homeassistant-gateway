from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import yaml

_SECRET_TERMS = ("token", "password", "secret", "cookie", "credential", "private_key")


def render_automation_yaml(value: Mapping[str, Any]) -> str:
    """Render a bounded automation configuration without exposing secrets."""
    return yaml.safe_dump(
        _sanitize(value),
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=100,
    ).rstrip() + "\n"


def analyze_automation_config(config: Mapping[str, Any]) -> list[dict[str, str]]:
    """Return conservative, static findings without executing templates or actions."""
    findings: list[dict[str, str]] = []
    trigger = config.get("trigger")
    action = config.get("action")
    if trigger in (None, [], {}):
        findings.append({"severity": "error", "code": "missing_trigger", "message": "The automation has no trigger."})
    if action in (None, [], {}):
        findings.append({"severity": "error", "code": "missing_action", "message": "The automation has no action."})

    mode = config.get("mode")
    if mode == "single":
        findings.append({
            "severity": "info",
            "code": "single_mode",
            "message": "The automation uses single mode; overlapping runs are ignored while one run is active.",
        })
    if isinstance(config.get("condition"), list) and not config["condition"]:
        findings.append({"severity": "info", "code": "no_conditions", "message": "The automation has no conditions."})

    entity_ids = _collect_values(config, {"entity_id", "entity_ids"})
    if len(entity_ids) != len(set(entity_ids)):
        findings.append({
            "severity": "warning",
            "code": "duplicate_entity_reference",
            "message": "The automation references the same entity more than once.",
        })
    services = _collect_values(config, {"service", "action"})
    for service in services:
        if service.count(".") != 1 or any(not part for part in service.split(".", 1)):
            findings.append({
                "severity": "warning",
                "code": "invalid_service_reference",
                "message": f"The service reference {service!r} does not use the expected domain.service form.",
            })
    return findings


def _collect_values(value: Any, keys: set[str]) -> list[str]:
    found: list[str] = []
    if isinstance(value, Mapping):
        for key, item in value.items():
            if str(key) in keys:
                if isinstance(item, str):
                    found.append(item)
                elif isinstance(item, list):
                    found.extend(str(entry) for entry in item if isinstance(entry, str))
            found.extend(_collect_values(item, keys))
    elif isinstance(value, list):
        for item in value:
            found.extend(_collect_values(item, keys))
    return found


def _sanitize(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            str(key): "[REDACTED]" if any(term in str(key).lower() for term in _SECRET_TERMS) else _sanitize(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return value
