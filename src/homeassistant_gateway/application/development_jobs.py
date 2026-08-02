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

    def __init__(self, runner: DevelopmentToolRunner, report_store: DevelopmentReportStore | None = None) -> None:
        self._runner = runner
        self._report_store = report_store
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="development-probe")
        self._jobs: dict[str, _Job] = {}
        self._lock = Lock()

    def start(self, operation: str, parameters: dict[str, Any] | None = None) -> str:
        operations = self._resolve_operations(operation)
        safe_parameters = parameters or {}
        with self._lock:
            self._prune_locked()
            if sum(job.status in {"queued", "running"} for job in self._jobs.values()) >= 2:
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
            total = len(job.operations)
            completed = len(job.results)
            if job.status in {"completed", "warning", "error"}:
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
            if job is None:
                return
            job.status = "running"
            job.started_at = time()

        for operation in job.operations:
            try:
                result = self._runner.run(operation, job.parameters if len(job.operations) == 1 else {})
            except HomeAssistantUnavailable as error:
                result = DevelopmentResult("unavailable", operation, 0, 0, reason=str(error))
            except ValueError as error:
                result = DevelopmentResult("error", operation, 0, 0, reason=str(error))
            with self._lock:
                job.results.append(result)

        with self._lock:
            results = tuple(job.results)
            job.finished_at = time()
            job.status = "warning" if any(item.status == "warning" for item in results) else "completed"
            if any(item.status in {"error", "unavailable"} for item in results):
                job.status = "error"
            report = build_development_report(job.operation, results)
            if self._report_store is not None:
                self._report_store.save(report)

    def _prune_locked(self) -> None:
        cutoff = time() - 3600
        stale = [job_id for job_id, job in self._jobs.items() if job.finished_at is not None and job.finished_at < cutoff]
        for job_id in stale:
            self._jobs.pop(job_id, None)
        if len(self._jobs) >= 32:
            finished = sorted((job for job in self._jobs.values() if job.finished_at is not None), key=lambda item: item.finished_at or 0)
            for job in finished[: max(1, len(self._jobs) - 31)]:
                self._jobs.pop(job.job_id, None)
