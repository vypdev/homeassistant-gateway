from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from threading import Lock
from time import time
from typing import Any
from uuid import uuid4

from homeassistant_gateway.application.development import (
    DevelopmentReportStore,
    DevelopmentResult,
    DevelopmentToolRunner,
    build_development_report,
    development_catalog,
    development_packs,
)
from homeassistant_gateway.application.home_assistant import HomeAssistantUnavailable


@dataclass
class _Job:
    job_id: str
    operation: str
    operations: tuple[str, ...]
    status: str = "queued"
    created_at: float = field(default_factory=time)
    started_at: float | None = None
    finished_at: float | None = None
    results: list[DevelopmentResult] = field(default_factory=list)
    error: str | None = None
    parameters: dict[str, Any] = field(default_factory=dict)


class DevelopmentJobManager:
    """Run bounded development probes outside the HTTP request thread."""

    MAX_ACTIVE_JOBS = 2
    MAX_JOB_AGE_SECONDS = 300
    RETENTION_SECONDS = 3600

    def __init__(self, runner: DevelopmentToolRunner, report_store: DevelopmentReportStore | None = None) -> None:
        self._runner = runner
        self._report_store = report_store
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="development-probe")
        self._jobs: dict[str, _Job] = {}
        self._lock = Lock()
        self._shutdown = False

    def start(self, operation: str, parameters: dict[str, Any] | None = None) -> str:
        operations = self._resolve_operations(operation)
        safe_parameters = parameters or {}
        with self._lock:
            self._prune_locked()
            if self._shutdown:
                raise RuntimeError("development_jobs_shutdown")
            if sum(job.status in {"queued", "running"} for job in self._jobs.values()) >= self.MAX_ACTIVE_JOBS:
                raise RuntimeError("development_jobs_busy")
            job_id = uuid4().hex
            self._jobs[job_id] = _Job(job_id=job_id, operation=operation, operations=operations, parameters=safe_parameters)
        self._executor.submit(self._execute, job_id)
        return job_id

    def snapshot(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            self._expire_locked(job)
            total = len(job.operations)
            completed = len(job.results)
            if job.status in {"completed", "warning", "error", "cancelled"}:
                progress = 100
            else:
                progress = round(completed / total * 100) if total else 100
            return {
                "job_id": job.job_id,
                "operation": job.operation,
                "status": job.status,
                "progress": progress,
                "completed": completed,
                "total": total,
                "results": [asdict(result) for result in job.results],
                "error": job.error,
            }

    def cancel(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None or job.status != "queued":
                return False
            job.status = "cancelled"
            job.finished_at = time()
            return True

    def cleanup(self) -> None:
        with self._lock:
            self._prune_locked()

    def _resolve_operations(self, operation: str) -> tuple[str, ...]:
        catalog_names = {item.name for item in development_catalog()}
        if operation == "all":
            return tuple(item.name for item in development_catalog())
        if operation.startswith("pack:"):
            pack_name = operation.removeprefix("pack:")
            pack = next((item for item in development_packs() if item.name == pack_name), None)
            if pack is None:
                raise ValueError("unknown_development_pack")
            return pack.operations
        if operation not in catalog_names:
            raise ValueError("unknown_development_operation")
        return (operation,)

    def _execute(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None or job.status != "queued":
                return
            job.status = "running"
            job.started_at = time()

        try:
            for operation in job.operations:
                with self._lock:
                    self._expire_locked(job)
                    if job.status == "error":
                        return
                try:
                    result = self._runner.run(operation, job.parameters if len(job.operations) == 1 else {})
                except HomeAssistantUnavailable:
                    result = DevelopmentResult("unavailable", operation, 0, 0, reason="home_assistant_unavailable")
                except ValueError:
                    result = DevelopmentResult("error", operation, 0, 0, reason="invalid_development_operation")
                except Exception:  # noqa: BLE001 - sanitize unexpected probe failures
                    result = DevelopmentResult("error", operation, 0, 0, reason="development_probe_failed")
                with self._lock:
                    if job.status == "error":
                        return
                    job.results.append(result)

            with self._lock:
                results = tuple(job.results)
                job.finished_at = time()
                job.status = "warning" if any(item.status == "warning" for item in results) else "completed"
                if any(item.status in {"error", "unavailable"} for item in results):
                    job.status = "error"

            previous = None
            if self._report_store is not None:
                previous_reports = self._report_store.list(1)
                previous = previous_reports[0] if previous_reports else None
            report = build_development_report(job.operation, results, previous)
            if self._report_store is not None:
                try:
                    self._report_store.save(report)
                except Exception:  # noqa: BLE001 - persistence failures are terminal job errors
                    with self._lock:
                        job.status = "error"
                        job.error = "report_persistence_failed"
                        job.finished_at = time()
        except Exception:  # noqa: BLE001 - guarantee a terminal state for worker failures
            with self._lock:
                job.status = "error"
                job.error = "development_job_failed"
                job.finished_at = time()

    def shutdown(self) -> None:
        """Stop accepting new work and cancel queued jobs during app shutdown."""
        with self._lock:
            self._shutdown = True
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _expire_locked(self, job: _Job) -> None:
        if job.status not in {"queued", "running"}:
            return
        reference = job.started_at or job.created_at
        if time() - reference >= self.MAX_JOB_AGE_SECONDS:
            job.status = "error"
            job.error = "development_job_timeout" if job.started_at is not None else "development_job_expired"
            job.finished_at = time()

    def _prune_locked(self) -> None:
        now = time()
        cutoff = now - self.RETENTION_SECONDS
        stale = [job_id for job_id, job in self._jobs.items() if job.finished_at is not None and job.finished_at < cutoff]
        for job_id in stale:
            self._jobs.pop(job_id, None)
        if len(self._jobs) >= 32:
            finished = sorted((job for job in self._jobs.values() if job.finished_at is not None), key=lambda item: item.finished_at or 0)
            for job in finished[: max(1, len(self._jobs) - 31)]:
                self._jobs.pop(job.job_id, None)
