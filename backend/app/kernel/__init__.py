from __future__ import annotations

from typing import Any, cast

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
    return E(*cast(Any, args), **cast(Any, kwargs))


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
