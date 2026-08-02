from __future__ import annotations

from typing import Any

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable


class SupervisorRegistryReader:
    """Read Home Assistant registries with a template fallback for older cores."""

    def extended_read(self: Any, resource: str) -> list[dict[str, Any]]:
        registry_paths = {
            "devices": "/config/device_registry/list",
            "areas": "/config/area_registry/list",
            "floors": "/config/floor_registry/list",
            "labels": "/config/label_registry/list",
            "entity_registry": "/config/entity_registry/list",
        }
        if resource in registry_paths:
            try:
                payload = self._get_json(registry_paths[resource], default=[], allow_not_found=False)
            except HomeAssistantUnavailable as error:
                if error.status != 404:
                    raise
                payload = self._template_registry(resource)
            return self._bounded_list(payload)
        states = self.states()
        prefixes = {"scripts": ("script.",), "scenes": ("scene.",), "helpers": ("input_",)}
        if resource in prefixes:
            return [item for item in states if str(item.get("entity_id", "")).startswith(prefixes[resource])]
        if resource == "integrations":
            domains = sorted({str(item.get("entity_id", "")).split(".", 1)[0] for item in states if "." in str(item.get("entity_id", ""))})
            return [{"domain": domain} for domain in domains]
        raise ValueError("unknown_extended_resource")

    def _template_registry(self: Any, resource: str) -> list[dict[str, Any]]:
        templates = {
            "areas": "{% set ns = namespace(items=[]) %}{% for id in areas() %}{% set ns.items = ns.items + [{'id': id, 'name': area_name(id), 'entities': area_entities(id), 'devices': area_devices(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "floors": "{% set ns = namespace(items=[]) %}{% for id in floors() %}{% set ns.items = ns.items + [{'id': id, 'name': floor_name(id), 'areas': floor_areas(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "labels": "{% set ns = namespace(items=[]) %}{% for id in labels() %}{% set ns.items = ns.items + [{'id': id, 'name': label_name(id), 'description': label_description(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "devices": "{% set ns = namespace(ids=[]) %}{% for item in states %}{% set id = device_id(item.entity_id) %}{% if id and id not in ns.ids %}{% set ns.ids = ns.ids + [id] %}{% endif %}{% endfor %}{% set ns.items = [] %}{% for id in ns.ids %}{% set ns.items = ns.items + [{'id': id, 'name': device_attr(id, 'name'), 'manufacturer': device_attr(id, 'manufacturer'), 'model': device_attr(id, 'model'), 'area_id': device_attr(id, 'area_id'), 'entities': device_entities(id)}] %}{% endfor %}{{ ns.items | tojson }}",
            "entity_registry": "{% set ns = namespace(items=[]) %}{% for item in states %}{% set ns.items = ns.items + [{'entity_id': item.entity_id, 'state': item.state, 'attributes': item.attributes}] %}{% endfor %}{{ ns.items | tojson }}",
        }
        return self._post_template(templates[resource])
