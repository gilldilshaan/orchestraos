from __future__ import annotations

import time
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from app.kernel.runtime_org_manager import RuntimeOrganizationManager

# ── Typed Action Models ─────────────────────────────────────────────────────


class SupervisorActionType(StrEnum):
    SPAWN_SPECIALIST = "spawn_specialist"
    RETRY_TASK = "retry_task"
    MERGE_REPORTS = "merge_reports"
    ESCALATE_TO_CEO = "escalate_to_ceo"
    MARK_DUPLICATE = "mark_duplicate"
    REASSIGN_TASK = "reassign_task"
    PAUSE_EXECUTION = "pause_execution"
    RESUME_EXECUTION = "resume_execution"


class SupervisorAction(BaseModel):
    """A single typed action the supervisor recommends."""

    action_type: SupervisorActionType
    target: str = ""
    reason: str = ""
    priority: int = 5  # 1-10, higher = more urgent


class SupervisorRecommendation(BaseModel):
    """A bundle of supervisor observations and actions."""

    actions: list[SupervisorAction] = Field(default_factory=list)
    detected_bottlenecks: list[str] = Field(default_factory=list)
    detected_idle: list[str] = Field(default_factory=list)
    detected_duplicates: list[str] = Field(default_factory=list)
    low_confidence_areas: list[str] = Field(default_factory=list)
    health_score: float = 1.0  # 0.0 (critical) to 1.0 (healthy)


class SupervisorAnalysis(BaseModel):
    """Snapshot of supervisor analysis for one executive."""

    executive: str
    recommendations: SupervisorRecommendation
    execution_health: str = "healthy"  # "healthy" | "degraded" | "critical"
    timestamp: str = ""


# ── Runtime Supervisor ─────────────────────────────────────────────────────


class RuntimeSupervisor:
    """Continuously evaluates the running organization.

    After each executive completes, call analyze() to detect issues and
    produce typed recommendations.  In this phase the supervisor observes
    and recommends only — future phases will allow it to mutate execution.

    Heuristics are intentionally simple.  LLM-driven analysis will be
    added in a later phase.
    """

    def __init__(
        self,
        objective_id: str,
        manager: RuntimeOrganizationManager,
    ) -> None:
        self._objective_id = objective_id
        self._manager = manager
        self._analyses: list[SupervisorAnalysis] = []
        self._paused = False

    # ── Public API ───────────────────────────────────────────────────────

    def analyze(self, executive_title: str) -> SupervisorAnalysis:
        """Run all detectors and produce a recommendation bundle."""
        bottlenecks = self.detect_bottlenecks(executive_title)
        idle = self.detect_idle_specialists(executive_title)
        duplicates = self.detect_duplicate_work(executive_title)
        low_conf = self.detect_low_confidence(executive_title)
        actions = self.recommend_actions(
            executive_title, bottlenecks, idle, duplicates, low_conf,
        )

        health = self._compute_health(
            bottlenecks, idle, duplicates, low_conf,
        )

        rec = SupervisorRecommendation(
            actions=actions,
            detected_bottlenecks=bottlenecks,
            detected_idle=idle,
            detected_duplicates=duplicates,
            low_confidence_areas=low_conf,
            health_score=health,
        )

        exec_health = "healthy"
        if health < 0.6:
            exec_health = "critical"
        elif health < 0.8:
            exec_health = "degraded"

        analysis = SupervisorAnalysis(
            executive=executive_title,
            recommendations=rec,
            execution_health=exec_health,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

        self._analyses.append(analysis)
        self._manager.store_supervisor_analysis(analysis)
        return analysis

    def list_analyses(self) -> list[SupervisorAnalysis]:
        return list(self._analyses)

    def latest_analysis(self) -> SupervisorAnalysis | None:
        return self._analyses[-1] if self._analyses else None

    def overall_health(self) -> float:
        if not self._analyses:
            return 1.0
        return sum(a.recommendations.health_score for a in self._analyses) / len(self._analyses)

    # ── Detectors ────────────────────────────────────────────────────────

    SPECIALIST_OVERLOAD_THRESHOLD = 5
    LOW_CONFIDENCE_THRESHOLD = 0.4
    SLOW_EXECUTION_THRESHOLD = 5.0  # seconds

    def detect_bottlenecks(self, executive_title: str) -> list[str]:
        """Detect bottlenecks for a given executive.

        Checks:
        - Too many specialists (overloaded executive)
        - Slow specialist execution
        - Failed specialists
        """
        bottlenecks: list[str] = []
        specialists = self._manager.list_specialists(executive_title)
        exec_data = self._manager.get_executive(executive_title)

        # Overloaded executive
        if len(specialists) > self.SPECIALIST_OVERLOAD_THRESHOLD:
            bottlenecks.append(
                f"Executive '{executive_title}' has {len(specialists)} specialists "
                f"(threshold: {self.SPECIALIST_OVERLOAD_THRESHOLD})"
            )

        # Slow specialists
        for s in specialists:
            if s.status == "running" and len(specialists) > 3:
                bottlenecks.append(
                    f"Specialist '{s.title}' may be slow — "
                    f"{len([x for x in specialists if x.status == 'completed'])}/"
                    f"{len(specialists)} completed"
                )

        # Failed specialists
        failed = [s for s in specialists if s.status == "failed"]
        if failed:
            names = ", ".join(s.title for s in failed)
            bottlenecks.append(f"Specialists failed under '{executive_title}': {names}")

        # Low executive confidence
        if (
            exec_data
            and exec_data.confidence is not None
            and exec_data.confidence < self.LOW_CONFIDENCE_THRESHOLD
        ):
            bottlenecks.append(
                f"Executive '{executive_title}' has low confidence "
                f"({exec_data.confidence:.2f})"
            )

        return bottlenecks

    def detect_idle_specialists(self, executive_title: str) -> list[str]:
        """Detect specialists that were registered but never completed."""
        idle: list[str] = []
        specialists = self._manager.list_specialists(executive_title)
        for s in specialists:
            if s.status == "pending":
                idle.append(
                    f"Specialist '{s.title}' under '{executive_title}' "
                    f"is pending — never started"
                )
        return idle

    def detect_duplicate_work(self, executive_title: str) -> list[str]:
        """Detect specialists with overlapping focus areas."""
        duplicates: list[str] = []
        specialists = self._manager.list_specialists(executive_title)
        for i in range(len(specialists)):
            for j in range(i + 1, len(specialists)):
                a = specialists[i]
                b = specialists[j]
                if a.title.lower().split() == b.title.lower().split():
                    duplicates.append(
                        f"Potential duplicate: '{a.title}' and '{b.title}' "
                        f"under '{executive_title}'"
                    )
        return duplicates

    def detect_low_confidence(self, executive_title: str) -> list[str]:
        """Detect areas where confidence is below threshold."""
        low: list[str] = []
        specialists = self._manager.list_specialists(executive_title)
        for s in specialists:
            if s.confidence is not None and 0 < s.confidence < self.LOW_CONFIDENCE_THRESHOLD:
                low.append(
                    f"Specialist '{s.title}' under '{executive_title}' "
                    f"has low confidence ({s.confidence:.2f})"
                )
        exec_data = self._manager.get_executive(executive_title)
        if (
            exec_data
            and exec_data.confidence is not None
            and 0 < exec_data.confidence < self.LOW_CONFIDENCE_THRESHOLD
        ):
            low.append(
                f"Executive '{executive_title}' has low confidence "
                f"({exec_data.confidence:.2f})"
            )
        return low

    # ── Recommendation engine ────────────────────────────────────────────

    def recommend_actions(
        self,
        executive_title: str,
        bottlenecks: list[str],
        idle: list[str],
        duplicates: list[str],
        low_confidence: list[str],
    ) -> list[SupervisorAction]:
        """Convert detector output into typed SupervisorActions."""
        actions: list[SupervisorAction] = []

        for _ in bottlenecks:
            actions.append(SupervisorAction(
                action_type=SupervisorActionType.REASSIGN_TASK,
                target=executive_title,
                reason="Bottleneck detected — consider reassigning tasks",
                priority=7,
            ))

        for idle_msg in idle:
            actions.append(SupervisorAction(
                action_type=SupervisorActionType.RETRY_TASK,
                target=executive_title,
                reason=idle_msg,
                priority=6,
            ))

        for _ in duplicates:
            actions.append(SupervisorAction(
                action_type=SupervisorActionType.MARK_DUPLICATE,
                target=executive_title,
                reason="Duplicate work detected — mark for merge",
                priority=5,
            ))

        for conf_msg in low_confidence:
            actions.append(SupervisorAction(
                action_type=SupervisorActionType.ESCALATE_TO_CEO,
                target=executive_title,
                reason=conf_msg,
                priority=8,
            ))

        return actions

    def apply_actions(
        self,
        actions: list[SupervisorAction],
    ) -> list[dict[str, Any]]:
        """Store actions on the manager for later retrieval.

        In this phase, actions are stored but not executed.
        Returns a summary for logging/observability.
        """
        stored: list[dict[str, Any]] = []
        for action in actions:
            record = {
                "action_type": action.action_type.value,
                "target": action.target,
                "reason": action.reason,
                "priority": action.priority,
                "applied": False,
            }
            self._manager.store_supervisor_action(action)
            stored.append(record)
        return stored

    # ── Health computation ───────────────────────────────────────────────

    def _compute_health(
        self,
        bottlenecks: list[str],
        idle: list[str],
        duplicates: list[str],
        low_confidence: list[str],
    ) -> float:
        """Compute a 0.0-1.0 health score from detector output."""
        issues = len(bottlenecks) + len(idle) + len(duplicates) + len(low_confidence)
        if issues == 0:
            return 1.0
        penalty = issues * 0.15
        return max(0.1, 1.0 - penalty)
