from __future__ import annotations

from time import monotonic, sleep

from homeassistant_gateway.application.development import DevelopmentReport, DevelopmentResult
from homeassistant_gateway.application.development_jobs import DevelopmentJobManager, _Job


class FakeRunner:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error

    def run(self, operation: str, parameters: dict[str, object]) -> DevelopmentResult:
        if self.error is not None:
            raise self.error
        return DevelopmentResult("ok", operation, 1, 1, data=[{"operation": operation}])


class FailingReportStore:
    def list(self, limit: int = 1) -> list[DevelopmentReport]:
        return []

    def save(self, report: DevelopmentReport) -> None:
        raise RuntimeError("storage unavailable")


def wait_for_terminal(manager: DevelopmentJobManager, job_id: str) -> dict[str, object]:
    deadline = monotonic() + 2
    snapshot = manager.snapshot(job_id)
    while snapshot and snapshot["status"] in {"queued", "running"} and monotonic() < deadline:
        sleep(0.01)
        snapshot = manager.snapshot(job_id)
    assert snapshot is not None
    return snapshot


def test_unexpected_runner_exception_reaches_terminal_error() -> None:
    manager = DevelopmentJobManager(FakeRunner(RuntimeError("boom")))
    try:
        snapshot = wait_for_terminal(manager, manager.start("states"))
        assert snapshot["status"] == "error"
        assert snapshot["results"][0]["reason"] == "development_probe_failed"
    finally:
        manager.shutdown()


def test_report_store_failure_reaches_terminal_error() -> None:
    manager = DevelopmentJobManager(FakeRunner(), FailingReportStore())
    try:
        snapshot = wait_for_terminal(manager, manager.start("states"))
        assert snapshot["status"] == "error"
        assert snapshot["error"] == "report_persistence_failed"
    finally:
        manager.shutdown()


def test_expired_job_is_terminal_and_redacted() -> None:
    manager = DevelopmentJobManager(FakeRunner())
    manager.MAX_JOB_AGE_SECONDS = 0
    try:
        with manager._lock:
            job = _Job(job_id="expired", operation="states", operations=("states",))
            job.created_at -= 1
            manager._jobs[job.job_id] = job
        snapshot = manager.snapshot("expired")
        assert snapshot is not None
        assert snapshot["status"] == "error"
        assert snapshot["error"] == "development_job_expired"
    finally:
        manager.shutdown()
