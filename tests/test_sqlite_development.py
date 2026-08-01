from homeassistant_gateway.application.development import (
    DevelopmentResult,
    build_development_report,
)
from homeassistant_gateway.infrastructure.storage.sqlite_development import (
    SQLiteDevelopmentReportStore,
)


def test_sqlite_development_reports_survive_reopen(tmp_path) -> None:
    database = tmp_path / "gateway.sqlite3"
    report = build_development_report("all", (DevelopmentResult("ok", "states", 4, 2, [{"entity_id": "light.kitchen"}]),))

    SQLiteDevelopmentReportStore(database).save(report)
    loaded = SQLiteDevelopmentReportStore(database).list()

    assert loaded[0].report_id == report.report_id
    assert loaded[0].schema_fingerprint == report.schema_fingerprint
    assert loaded[0].results[0].data == [{"entity_id": "light.kitchen"}]
