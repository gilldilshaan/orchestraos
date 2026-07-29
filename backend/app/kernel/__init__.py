from __future__ import annotations

from app.kernel.ai_kernel import AIKernel
from app.kernel.event_system import (
    EventMetadata,
    EventTimeline,
    EventType,
    ExecutionEvent,
    RunMetrics,
    TelemetryBus,
    make_event,
)


def ExecutionEngine(*args: object, **kwargs: object) -> object:  # noqa: N802
    """Lazy import to avoid circular dependency with app.agents."""
    from app.kernel.execution_engine import ExecutionEngine as E
    return E(*args, **kwargs)


ai_kernel = AIKernel()

__all__ = [
    "AIKernel",
    "EventMetadata",
    "EventTimeline",
    "EventType",
    "ExecutionEngine",
    "ExecutionEvent",
    "RunMetrics",
    "TelemetryBus",
    "ai_kernel",
    "make_event",
]
