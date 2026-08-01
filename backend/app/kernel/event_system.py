from __future__ import annotations

import json
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any


class EventType(StrEnum):
    RUN_STARTED = "run.started"
    OBJECTIVE_ANALYZED = "objective.analyzed"
    ORGANIZATION_CREATED = "organization.created"
    EXECUTIVE_CREATED = "executive.created"
    SPECIALIST_CREATED = "specialist.created"
    TASK_PLANNED = "task.planned"
    TASK_STARTED = "task.started"
    TASK_COMPLETED = "task.completed"
    SPECIALIST_REPORT_CREATED = "specialist_report.created"
    EXECUTIVE_REPORT_CREATED = "executive_report.created"
    SUPERVISOR_ANALYSIS_CREATED = "supervisor_analysis.created"
    DECISION_CREATED = "decision.created"
    RUN_COMPLETED = "run.completed"
    RUN_FAILED = "run.failed"
    NODE_RETRY = "node.retry"
    NODE_CANCELLED = "node.cancelled"


@dataclass
class EventMetadata:
    model_used: str | None = None
    prompt_version: str | None = None
    token_count: int = 0
    latency_ms: float = 0.0
    retry_attempt: int = 0
    confidence: float | None = None
    cost: float | None = None


@dataclass
class ExecutionEvent:
    event_id: str
    run_id: str
    timestamp: str
    event_type: EventType
    component: str
    source: str | None = None
    target: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    metadata: EventMetadata = field(default_factory=EventMetadata)


TelemetryHandler = Callable[["ExecutionEvent"], Awaitable[None]]


class TelemetryBus:
    """Lightweight typed event bus for execution telemetry.

    Provides publish/subscribe/unsubscribe for typed ExecutionEvent objects.
    Designed as an extension point for future WebSocket streaming, replay,
    and persistence integrations.
    """

    def __init__(self) -> None:
        self._subscribers: dict[EventType, list[TelemetryHandler]] = {}
        self._wildcard_subscribers: list[TelemetryHandler] = []

    def subscribe(self, event_type: EventType, handler: TelemetryHandler) -> None:
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    def unsubscribe(self, event_type: EventType, handler: TelemetryHandler) -> None:
        if event_type in self._subscribers:
            self._subscribers[event_type] = [
                h for h in self._subscribers[event_type] if h is not handler
            ]

    def subscribe_all(self, handler: TelemetryHandler) -> None:
        self._wildcard_subscribers.append(handler)

    def unsubscribe_all(self, handler: TelemetryHandler) -> None:
        self._wildcard_subscribers = [
            h for h in self._wildcard_subscribers if h is not handler
        ]

    async def publish(self, event: ExecutionEvent) -> None:
        handlers = list(self._subscribers.get(event.event_type, []))
        handlers.extend(self._wildcard_subscribers)
        for handler in handlers:
            try:
                await handler(event)
            except Exception:
                import logging
                logging.exception(
                    "Telemetry subscriber error for %s", event.event_type.value,
                )

    def clear(self) -> None:
        self._subscribers.clear()
        self._wildcard_subscribers.clear()


class EventTimeline:
    """Ordered sequence of ExecutionEvents for a single run.

    Provides filtering, duration calculation, and export capabilities
    for benchmarking and replay.
    """

    def __init__(self) -> None:
        self._events: list[ExecutionEvent] = []

    def append(self, event: ExecutionEvent) -> None:
        self._events.append(event)

    def filter(
        self,
        event_type: EventType | None = None,
        component: str | None = None,
        source: str | None = None,
    ) -> list[ExecutionEvent]:
        result = list(self._events)
        if event_type:
            result = [e for e in result if e.event_type == event_type]
        if component:
            result = [e for e in result if e.component == component]
        if source:
            result = [e for e in result if e.source == source]
        return result

    def get_events(self) -> list[ExecutionEvent]:
        return list(self._events)

    def duration(self) -> float:
        if len(self._events) < 2:
            return 0.0
        first = datetime.fromisoformat(self._events[0].timestamp)
        last = datetime.fromisoformat(self._events[-1].timestamp)
        return (last - first).total_seconds()

    def export(self, fmt: str = "dict") -> list[dict[str, Any]] | str:
        if fmt == "dict":
            return [
                {
                    "event_id": e.event_id,
                    "run_id": e.run_id,
                    "timestamp": e.timestamp,
                    "event_type": e.event_type.value,
                    "component": e.component,
                    "source": e.source,
                    "target": e.target,
                    "payload": e.payload,
                    "metadata": {
                        "model_used": e.metadata.model_used,
                        "prompt_version": e.metadata.prompt_version,
                        "token_count": e.metadata.token_count,
                        "latency_ms": e.metadata.latency_ms,
                        "retry_attempt": e.metadata.retry_attempt,
                        "confidence": e.metadata.confidence,
                        "cost": e.metadata.cost,
                    },
                }
                for e in self._events
            ]
        if fmt == "json":
            return json.dumps(self.export("dict"), indent=2, default=str)
        msg = f"Unsupported export format: {fmt}"
        raise ValueError(msg)


@dataclass
class RunMetrics:
    """Aggregated numeric metrics collected during a single run.

    Suitable for benchmarking, analytics, and dashboard display.
    """

    total_runtime: float = 0.0
    planning_time: float = 0.0
    execution_time: float = 0.0
    decision_time: float = 0.0
    reporting_time: float = 0.0
    total_nodes: int = 0
    completed_nodes: int = 0
    failed_nodes: int = 0
    parallelism: int = 0
    average_node_time: float = 0.0
    executive_count: int = 0
    specialist_count: int = 0
    token_usage: int = 0
    retry_count: int = 0

    def reset(self) -> None:
        for attr in self.__dataclass_fields__:
            default = self.__dataclass_fields__[attr].default
            setattr(self, attr, default() if callable(default) else default)

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_runtime": self.total_runtime,
            "planning_time": self.planning_time,
            "execution_time": self.execution_time,
            "decision_time": self.decision_time,
            "reporting_time": self.reporting_time,
            "total_nodes": self.total_nodes,
            "completed_nodes": self.completed_nodes,
            "failed_nodes": self.failed_nodes,
            "parallelism": self.parallelism,
            "average_node_time": self.average_node_time,
            "executive_count": self.executive_count,
            "specialist_count": self.specialist_count,
            "token_usage": self.token_usage,
            "retry_count": self.retry_count,
        }


def make_event_id() -> str:
    return uuid.uuid4().hex[:12]


def make_event(
    run_id: str,
    event_type: EventType,
    component: str,
    source: str | None = None,
    target: str | None = None,
    payload: dict[str, Any] | None = None,
    metadata: EventMetadata | None = None,
) -> ExecutionEvent:
    return ExecutionEvent(
        event_id=make_event_id(),
        run_id=run_id,
        timestamp=datetime.now(UTC).isoformat(),
        event_type=event_type,
        component=component,
        source=source,
        target=target,
        payload=payload or {},
        metadata=metadata or EventMetadata(),
    )
