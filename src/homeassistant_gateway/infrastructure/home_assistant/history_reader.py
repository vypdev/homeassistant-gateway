from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote

from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable
from homeassistant_gateway.application.trace_context import get_trace, set_trace


class SupervisorHistoryReader:
    """Read bounded history and logbook records from Home Assistant."""

    _LOGBOOK_WINDOW = timedelta(hours=1)

    def history(self: Any, entity_id: str | None = None, start_time: str | None = None) -> list[dict[str, Any]]:
        entity = entity_id or self._probe_entity("history")
        start = start_time or self._timestamp(datetime.now(UTC) - timedelta(days=1))
        try:
            payload = self._ws_command("history/history_during_period", {"start_time": start, "end_time": self._timestamp(datetime.now(UTC)), "entity_ids": [entity]})
            if isinstance(payload, dict):
                return [{"entity_id": key, "states": value[: self._max_items]} for key, value in payload.items() if isinstance(key, str) and isinstance(value, list)]
            return []
        except HomeAssistantUnavailable as error:
            if not self._is_websocket_fallback_allowed(error):
                raise
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
        start = start_time or self._timestamp(datetime.now(UTC) - timedelta(days=1))
        try:
            end = self._timestamp(datetime.now(UTC))
            window_start = self._parse_timestamp(start)
            window_end = self._parse_timestamp(end)
            events: list[dict[str, Any]] = []
            traces = ()
            while window_start < window_end and len(events) < self._max_items:
                current_end = min(window_start + self._LOGBOOK_WINDOW, window_end)
                payload = self._ws_command(
                    "logbook/get_events",
                    {
                        "start_time": self._timestamp(window_start),
                        "end_time": self._timestamp(current_end),
                        **({"entity_ids": [entity_id]} if entity_id else {}),
                    },
                )
                traces = (*traces, *get_trace())
                events.extend(item for item in self._bounded_list(payload) if isinstance(item, dict))
                events = self._deduplicate_events(events)
                window_start = current_end
            set_trace(traces)
            return events[: self._max_items]
        except HomeAssistantUnavailable as error:
            if not self._is_websocket_fallback_allowed(error):
                raise
        params = {"entity": entity_id} if entity_id else {}
        return self._bounded_list(self._get_json(f"/logbook/{quote(start, safe='')}", default=[], params=params, diagnostic_path="/logbook"))

    @staticmethod
    def _deduplicate_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        unique: list[dict[str, Any]] = []
        seen: set[str] = set()
        for event in events:
            fingerprint = json.dumps(event, sort_keys=True, separators=(",", ":"), default=str)
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            unique.append(event)
        return unique

    @staticmethod
    def _parse_timestamp(value: str) -> datetime:
        parsed = datetime.fromisoformat(value)
        return parsed.astimezone(UTC)
