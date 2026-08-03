from __future__ import annotations

from threading import Barrier, Event
from time import monotonic, sleep

from homeassistant_gateway.application.development import (
    DevelopmentReport,
    DevelopmentResult,
    DevelopmentToolRunner,
)
from homeassistant_gateway.application.development_jobs import DevelopmentJobManager, _Job
from homeassistant_gateway.application.development_models import DevelopmentTraceStep
from homeassistant_gateway.application.trace_context import append_trace, begin_trace


class FakeRunner:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error

    def run(self, operation: str, parameters: dict[str, object]) -> DevelopmentResult:
        if self.error is not None:
            raise self.error
        return DevelopmentResult("ok", operation, 1, 1, data=[{"operation": operation}])


class BlockingRunner:
    def __init__(self) -> None:
        self.started = Event()
        self.release = Event()

    def run(self, operation: str, parameters: dict[str, object]) -> DevelopmentResult:
        self.started.set()
        self.release.wait(timeout=2)
        return DevelopmentResult("ok", operation, 1, 1, data=[{"operation": operation}])


class ConcurrentTraceHomeAssistant:
    def __init__(self) -> None:
        self.barrier = Barrier(2)

    def begin_trace(self) -> None:
        begin_trace()

    def states(self, entity_id: str | None = None) -> list[dict[str, object]]:
        self.barrier.wait(timeout=2)
        marker = entity_id or "none"
        append_trace(DevelopmentTraceStep(
            phase="command",
            transport="fake",
            status="ok",
            duration_ms=0,
            command="states",
            detail=marker,
        ))
        return [{"entity_id": marker}]

    def __getattr__(self, name: str):
        def empty(*args, **kwargs):
            return []
        return empty


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


def test_running_job_timeout_has_terminal_timeout_reason() -> None:
    manager = DevelopmentJobManager(FakeRunner())
    manager.MAX_JOB_AGE_SECONDS = 0
    try:
        with manager._lock:
            job = _Job(job_id="timed-out", operation="states", operations=("states",))
            job.started_at = job.created_at - 1
            job.status = "running"
            manager._jobs[job.job_id] = job
        snapshot = manager.snapshot("timed-out")
        assert snapshot is not None
        assert snapshot["status"] == "error"
        assert snapshot["error"] == "development_job_timeout"
    finally:
        manager.shutdown()


def test_queued_job_can_be_cancelled_without_running() -> None:
    runner = BlockingRunner()
    manager = DevelopmentJobManager(runner)
    manager.MAX_ACTIVE_JOBS = 3
    try:
        first_id = manager.start("states")
        assert runner.started.wait(timeout=1)
        second_id = manager.start("states")
        queued_id = manager.start("states")
        assert manager.cancel(queued_id) is True
        snapshot = manager.snapshot(queued_id)
        assert snapshot is not None
        assert snapshot["status"] == "cancelled"
        assert manager.cancel(first_id) is False
        assert manager.cancel(second_id) is False
        runner.release.set()
        assert wait_for_terminal(manager, first_id)["status"] == "completed"
        assert wait_for_terminal(manager, second_id)["status"] == "completed"
    finally:
        runner.release.set()
        manager.shutdown()


def test_shutdown_rejects_new_jobs() -> None:
    manager = DevelopmentJobManager(FakeRunner())
    manager.shutdown()
    try:
        manager.start("states")
    except RuntimeError as error:
        assert str(error) == "development_jobs_shutdown"
    else:
        raise AssertionError("shutdown must reject new jobs")


def test_concurrent_jobs_keep_their_own_trace() -> None:
    runner = DevelopmentToolRunner(ConcurrentTraceHomeAssistant())
    manager = DevelopmentJobManager(runner)
    try:
        first_id = manager.start("states", {"entity_id": "sensor.first"})
        second_id = manager.start("states", {"entity_id": "sensor.second"})
        first = wait_for_terminal(manager, first_id)
        second = wait_for_terminal(manager, second_id)
        first_trace = first["results"][0]["trace"]
        second_trace = second["results"][0]["trace"]
        assert any(step["detail"] == "sensor.first" for step in first_trace)
        assert any(step["detail"] == "sensor.second" for step in second_trace)
        assert all(step["detail"] != "sensor.second" for step in first_trace)
        assert all(step["detail"] != "sensor.first" for step in second_trace)
    finally:
        manager.shutdown()
