from __future__ import annotations

from typing import Any


class WorkflowStateMachine:
    """Manages the finite state machine for objective workflow progression.

    States:
        draft → compiled → planning → organized → risk_analysis →
        decision_pending → approved → executing → monitoring → completed

    Each state has allowed transitions. Invalid transitions raise errors.
    """

    STATES = [
        "draft",
        "compiled",
        "planning",
        "planned",
        "organizing",
        "organized",
        "risk_analysis",
        "risks_analyzed",
        "decision_pending",
        "approved",
        "executing",
        "monitoring",
        "adapting",
        "completed",
        "failed",
        "cancelled",
    ]

    TRANSITIONS: dict[str, list[str]] = {
        "draft": ["compiled", "failed"],
        "compiled": ["planning", "failed"],
        "planning": ["planned", "failed"],
        "planned": ["organizing", "failed"],
        "organizing": ["organized", "failed"],
        "organized": ["risk_analysis", "failed"],
        "risk_analysis": ["risks_analyzed", "failed"],
        "risks_analyzed": ["decision_pending", "failed"],
        "decision_pending": ["approved", "failed", "cancelled"],
        "approved": ["executing", "adapting", "failed"],
        "executing": ["monitoring", "adapting", "failed", "completed"],
        "monitoring": ["adapting", "completed", "failed"],
        "adapting": ["executing", "monitoring", "completed", "failed"],
        "completed": [],
        "failed": ["compiled", "planning"],
        "cancelled": [],
    }

    STAGE_MAP: dict[str, str] = {
        "draft": "awaiting_compilation",
        "compiled": "compilation_complete",
        "planning": "planning_in_progress",
        "planned": "planning_complete",
        "organizing": "organization_in_progress",
        "organized": "organization_complete",
        "risk_analysis": "risk_analysis_in_progress",
        "risks_analyzed": "risk_analysis_complete",
        "decision_pending": "awaiting_human_approval",
        "approved": "approved",
        "executing": "executing",
        "monitoring": "monitoring",
        "adapting": "adapting",
        "completed": "completed",
        "failed": "failed",
        "cancelled": "cancelled",
    }

    @classmethod
    def is_valid_state(cls, state: str) -> bool:
        return state in cls.STATES

    @classmethod
    def can_transition(cls, current: str, target: str) -> bool:
        if not cls.is_valid_state(current):
            return False
        if not cls.is_valid_state(target):
            return False
        return target in cls.TRANSITIONS.get(current, [])

    @classmethod
    def get_allowed_transitions(cls, current: str) -> list[str]:
        return cls.TRANSITIONS.get(current, [])

    @classmethod
    def transition(cls, current: str, target: str) -> str:
        if not cls.can_transition(current, target):
            msg = f"Invalid transition: {current} → {target}. Allowed: {cls.TRANSITIONS.get(current, [])}"
            raise ValueError(msg)
        return target

    @classmethod
    def get_stage(cls, state: str) -> str:
        return cls.STAGE_MAP.get(state, state)

    @classmethod
    def is_terminal(cls, state: str) -> bool:
        return state in ("completed", "failed", "cancelled")

    @classmethod
    def is_active(cls, state: str) -> bool:
        return state not in ("completed", "failed", "cancelled")

    @classmethod
    def get_progress_percent(cls, state: str) -> float:
        order = [
            "draft", "compiled", "planning", "planned", "organizing",
            "organized", "risk_analysis", "risks_analyzed", "decision_pending",
            "approved", "executing", "monitoring", "completed",
        ]
        if state in ("failed", "cancelled"):
            return 0.0
        idx = order.index(state) if state in order else -1
        if idx < 0:
            return 0.0
        return round((idx / (len(order) - 1)) * 100, 1)
