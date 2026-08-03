from __future__ import annotations

from contextvars import ContextVar

from homeassistant_gateway.application.development_models import DevelopmentTraceStep

_TRACE: ContextVar[tuple[DevelopmentTraceStep, ...]] = ContextVar("development_trace", default=())
_FALLBACK_ACTIVE: ContextVar[bool] = ContextVar("development_fallback_active", default=False)


def begin_trace() -> None:
    """Start an isolated trace for the current execution context."""
    _TRACE.set(())
    _FALLBACK_ACTIVE.set(False)


def get_trace() -> tuple[DevelopmentTraceStep, ...]:
    """Return only the trace belonging to the current thread/task."""
    return _TRACE.get()


def set_trace(trace: tuple[DevelopmentTraceStep, ...]) -> None:
    _TRACE.set(trace)


def append_trace(step: DevelopmentTraceStep) -> None:
    _TRACE.set((*_TRACE.get(), step))


def mark_fallback_active() -> None:
    _FALLBACK_ACTIVE.set(True)


def fallback_active() -> bool:
    return _FALLBACK_ACTIVE.get()
