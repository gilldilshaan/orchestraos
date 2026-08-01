from __future__ import annotations

import asyncio
import time as _time
from typing import Any

from app.kernel.event_system import (
    EventMetadata,
    EventTimeline,
    EventType,
    ExecutionEvent,
    RunMetrics,
    TelemetryBus,
    make_event,
)
from app.kernel.runtime_executive import (
    RuntimeExecutive,
    SpecialistInstance,
)
from app.schemas.dynamic_org import DynamicOrganizationStructure


class RuntimeOrganizationManager:
    """Owner of the live organization during execution.

    Responsibilities:
      - Register executives and specialists
      - Track execution state across the entire org
      - Provide specialist lookup (by title, by executive)
      - Collect execution metrics
      - Store supervisor analyses and recommendations
      - Maintain telemetry timeline, metrics, and active events
      - Clean up when execution completes
    """

    def __init__(
        self,
        objective_id: str,
        telemetry_bus: TelemetryBus | None = None,
    ) -> None:
        self.objective_id = objective_id
        self._organization: DynamicOrganizationStructure | None = None
        self._executives: dict[str, RuntimeExecutive] = {}
        self._specialists: dict[str, SpecialistInstance] = {}
        self._status: str = "created"
        self._metrics: dict[str, Any] = {}
        self._started_at: float | None = None
        self._completed_at: float | None = None
        self._supervisor_analyses: list[dict[str, Any]] = []
        self._supervisor_actions: list[dict[str, Any]] = []

        # ── Telemetry ────────────────────────────────────────────────────
        self._telemetry_bus = telemetry_bus
        self._timeline = EventTimeline()
        self._run_metrics = RunMetrics()
        self._active_events: dict[str, ExecutionEvent] = {}

    # ── Telemetry accessors (additive, non-breaking) ─────────────────────

    def get_timeline(self) -> EventTimeline:
        return self._timeline

    def get_run_metrics(self) -> RunMetrics:
        return self._run_metrics

    def get_active_events(self) -> dict[str, ExecutionEvent]:
        return dict(self._active_events)

    def emit_event(
        self,
        event_type: EventType,
        component: str,
        source: str | None = None,
        target: str | None = None,
        payload: dict[str, Any] | None = None,
        metadata: EventMetadata | None = None,
    ) -> ExecutionEvent:
        event = make_event(
            run_id=self.objective_id,
            event_type=event_type,
            component=component,
            source=source,
            target=target,
            payload=payload,
            metadata=metadata,
        )
        self._timeline.append(event)
        if self._telemetry_bus is not None:
            asyncio.ensure_future(self._telemetry_bus.publish(event))  # noqa: RUF006
        return event

    def _start_active(self, event: ExecutionEvent) -> None:
        self._active_events[event.event_id] = event

    def _end_active(self, event_id: str) -> ExecutionEvent | None:
        return self._active_events.pop(event_id, None)

    # ── Organization lifecycle ──────────────────────────────────────────

    def register_organization(self, org: DynamicOrganizationStructure) -> None:
        """Register the org blueprint."""
        self._organization = org
        self._metrics["company_name"] = org.company_name
        self._metrics["industry"] = org.industry
        self._metrics["executive_count"] = len(org.executives)

    def get_organization(self) -> DynamicOrganizationStructure | None:
        return self._organization

    # ── Executive management ────────────────────────────────────────────

    def register_executive(self, exec_runtime: RuntimeExecutive) -> None:
        """Register a live executive runtime."""
        self._executives[exec_runtime.title] = exec_runtime
        self._run_metrics.executive_count = len(self._executives)
        self.emit_event(
            EventType.EXECUTIVE_CREATED,
            component="runtime_org_manager",
            source=exec_runtime.title,
            payload={
                "title": exec_runtime.title,
                "purpose": exec_runtime.purpose,
                "status": exec_runtime.status,
            },
        )

    def get_executive(self, title: str) -> RuntimeExecutive | None:
        return self._executives.get(title)

    def list_executives(self) -> list[RuntimeExecutive]:
        return list(self._executives.values())

    def executive_count(self) -> int:
        return len(self._executives)

    # ── Specialist management ───────────────────────────────────────────

    def register_specialist(self, instance: SpecialistInstance) -> None:
        """Register a specialist instance under its title.

        Titles are unique within an organization run. If a title already
        exists, it is overwritten (last-writer-wins for simplicity).
        """
        self._specialists[instance.title] = instance
        self._run_metrics.specialist_count = len(self._specialists)
        self.emit_event(
            EventType.SPECIALIST_CREATED,
            component="runtime_org_manager",
            source=instance.title,
            target=instance.executive_title,
            payload={
                "title": instance.title,
                "executive_title": instance.executive_title,
                "purpose": instance.purpose,
                "status": instance.status,
            },
        )

    def get_specialist(self, title: str) -> SpecialistInstance | None:
        return self._specialists.get(title)

    def list_specialists(self, executive_title: str | None = None) -> list[SpecialistInstance]:
        """List all specialists, optionally filtered by executive."""
        if executive_title is None:
            return list(self._specialists.values())
        return [
            s for s in self._specialists.values()
            if s.executive_title == executive_title
        ]

    def specialist_count(self) -> int:
        return len(self._specialists)

    # ── Execution state ─────────────────────────────────────────────────

    def update_status(self, status: str) -> None:
        self._status = status

    def get_status(self) -> str:
        return self._status

    def mark_started(self) -> None:
        self._started_at = _time.monotonic()
        self._status = "running"
        self._run_metrics.total_runtime = 0.0
        self.emit_event(
            EventType.RUN_STARTED,
            component="runtime_org_manager",
            payload={"status": "running"},
        )

    def mark_completed(self) -> None:
        self._completed_at = _time.monotonic()
        self._status = "completed"
        if self._started_at is not None:
            self._run_metrics.total_runtime = self._completed_at - self._started_at
        self.emit_event(
            EventType.RUN_COMPLETED,
            component="runtime_org_manager",
            payload={"status": "completed", "total_runtime": self._run_metrics.total_runtime},
        )

    def mark_failed(self, reason: str) -> None:
        self._status = "failed"
        self._metrics["failure_reason"] = reason
        if self._started_at is not None:
            self._completed_at = _time.monotonic()
            self._run_metrics.total_runtime = self._completed_at - self._started_at
        self.emit_event(
            EventType.RUN_FAILED,
            component="runtime_org_manager",
            payload={
                "status": "failed",
                "reason": reason,
                "total_runtime": self._run_metrics.total_runtime,
            },
        )

    # ── Metrics ─────────────────────────────────────────────────────────

    def get_metrics(self) -> dict[str, Any]:
        exec_metrics = []
        for ex in self._executives.values():
            ex_specialists = self.list_specialists(ex.title)
            exec_metrics.append({
                "title": ex.title,
                "status": ex.status,
                "confidence": ex.confidence,
                "specialist_count": len(ex_specialists),
                "specialists": [
                    {"title": s.title, "status": s.status, "confidence": s.confidence}
                    for s in ex_specialists
                ],
            })

        elapsed = None
        if self._started_at is not None and self._completed_at is not None:
            elapsed = self._completed_at - self._started_at

        return {
            "objective_id": self.objective_id,
            "status": self._status,
            "elapsed_seconds": elapsed,
            "company_name": self._metrics.get("company_name"),
            "industry": self._metrics.get("industry"),
            "executive_count": len(self._executives),
            "specialist_count": len(self._specialists),
            "executives": exec_metrics,
            **{k: v for k, v in self._metrics.items()
               if k not in ("company_name", "industry", "executive_count")},
        }

    # ── Supervisor integration ─────────────────────────────────────────────

    def store_supervisor_analysis(self, analysis: Any) -> None:
        """Store a supervisor analysis snapshot."""
        self._supervisor_analyses.append({
            "executive": analysis.executive,
            "health": analysis.execution_health,
            "health_score": analysis.recommendations.health_score,
            "timestamp": analysis.timestamp,
            "bottlenecks": list(analysis.recommendations.detected_bottlenecks),
            "idle": list(analysis.recommendations.detected_idle),
            "duplicates": list(analysis.recommendations.detected_duplicates),
            "low_confidence": list(analysis.recommendations.low_confidence_areas),
            "action_count": len(analysis.recommendations.actions),
        })

    def store_supervisor_action(self, action: Any) -> None:
        """Store a recommended action."""
        self._supervisor_actions.append({
            "action_type": action.action_type.value,
            "target": action.target,
            "reason": action.reason,
            "priority": action.priority,
            "applied": False,
        })

    def get_supervisor_analyses(self) -> list[dict[str, Any]]:
        return list(self._supervisor_analyses)

    def get_supervisor_actions(self) -> list[dict[str, Any]]:
        return list(self._supervisor_actions)

    def supervisor_health_score(self) -> float:
        if not self._supervisor_analyses:
            return 1.0
        scores = [a["health_score"] for a in self._supervisor_analyses]
        return float(sum(scores) / len(scores))

    def supervisor_bottlenecks(self) -> list[str]:
        all_bn: list[str] = []
        for a in self._supervisor_analyses:
            all_bn.extend(a["bottlenecks"])
        return all_bn

    # ── Telemetry summary ───────────────────────────────────────────────

    def get_telemetry_summary(self) -> dict[str, Any]:
        return {
            "objective_id": self.objective_id,
            "status": self._status,
            "timeline_event_count": len(self._timeline.get_events()),
            "timeline_duration": self._timeline.duration(),
            "active_events": len(self._active_events),
            "run_metrics": self._run_metrics.to_dict(),
        }

    # ── Cleanup ─────────────────────────────────────────────────────────
    def cleanup(self) -> None:
        """Release all references. Called after execution completes."""
        self._organization = None
        self._executives.clear()
        self._specialists.clear()
        self._metrics.clear()
        self._supervisor_analyses.clear()
        self._supervisor_actions.clear()
        self._active_events.clear()
        self._status = "cleaned_up"
