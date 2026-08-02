from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote


class SupervisorHistoryReader:
    """Read bounded history and logbook records from Home Assistant."""

    def history(self: Any, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]:
        entity = entity_id or self._probe_entity("history")
        start = start_time or self._timestamp(datetime.now(UTC) - timedelta(days=1))
        params = {"filter_entity_id": entity}
        payload = self._get_json(f"/history/period/{quote(start, safe='')}", default=[], params=params, diagnostic_path="/history/period")
        if not isinstance(payload, list):
            return []
        groups: list[dict[str, Any]] = []
        for group in payload[: self._max_items]:
            if not isinstance(group, list):
                continue
            states = [item for item in group[: self._max_items] if isinstance(item, dict)]
            if states:
                groups.append({"entity_id": states[0].get("entity_id"), "states": states})
        return groups

    def logbook(self: Any, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]:
        entity = entity_id or self._probe_entity("logbook")
        start = start_time or self._timestamp(datetime.now(UTC) - timedelta(days=1))
        params = {"entity": entity}
        return self._bounded_list(self._get_json(f"/logbook/{quote(start, safe='')}", default=[], params=params, diagnostic_path="/logbook"))
