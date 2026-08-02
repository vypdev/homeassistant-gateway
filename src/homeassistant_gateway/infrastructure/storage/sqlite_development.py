from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict
from pathlib import Path

from homeassistant_gateway.application.development import (
    DevelopmentReport,
    DevelopmentReportStore,
    DevelopmentResult,
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS development_reports (
    report_id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL,
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    schema_fingerprint TEXT NOT NULL,
    results_json TEXT NOT NULL,
    comparison_json TEXT,
    comparison_details_json TEXT
)
"""


class SQLiteDevelopmentReportStore(DevelopmentReportStore):
    """Persistent store for sanitized development evidence only."""

    def __init__(self, database: Path) -> None:
        self._database = Path(database)
        self._database.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self._database.touch(mode=0o600, exist_ok=True)
        with self._connect() as connection:
            connection.execute(_SCHEMA)
            columns = {row["name"] for row in connection.execute("PRAGMA table_info(development_reports)")}
            if "comparison_details_json" not in columns:
                connection.execute("ALTER TABLE development_reports ADD COLUMN comparison_details_json TEXT")

    def save(self, report: DevelopmentReport) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO development_reports
                (report_id, occurred_at, operation, status, duration_ms, total_count,
                 schema_fingerprint, results_json, comparison_json, comparison_details_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report.report_id,
                    report.occurred_at,
                    report.operation,
                    report.status,
                    report.duration_ms,
                    report.total_count,
                    report.schema_fingerprint,
                    json.dumps([asdict(item) for item in report.results], sort_keys=True, default=str),
                    json.dumps(report.comparison, sort_keys=True) if report.comparison is not None else None,
                    json.dumps(report.comparison_details, sort_keys=True) if report.comparison_details is not None else None,
                ),
            )

    def list(self, limit: int = 20) -> list[DevelopmentReport]:
        if limit < 1 or limit > 100:
            raise ValueError("invalid_development_report_limit")
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM development_reports ORDER BY occurred_at DESC, report_id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [self._from_row(row) for row in rows]

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _from_row(row: sqlite3.Row) -> DevelopmentReport:
        results = tuple(DevelopmentResult(**item) for item in json.loads(row["results_json"]))
        comparison = json.loads(row["comparison_json"]) if row["comparison_json"] else None
        comparison_details = json.loads(row["comparison_details_json"]) if row["comparison_details_json"] else None
        return DevelopmentReport(
            report_id=row["report_id"],
            occurred_at=row["occurred_at"],
            operation=row["operation"],
            status=row["status"],
            duration_ms=row["duration_ms"],
            total_count=row["total_count"],
            schema_fingerprint=row["schema_fingerprint"],
            results=results,
            comparison=comparison,
            comparison_details=comparison_details,
        )
