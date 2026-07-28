from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ExecutionContext:
    """Shared context passed through the agent pipeline.

    Every agent reads from and writes to this context, avoiding redundant
    database lookups and providing a single source of truth for the pipeline.
    """

    objective_id: str
    objective_raw: str = ""
    objective_status: str = "draft"
    objective_stage: str = ""

    compilation: dict[str, Any] | None = None
    readiness: dict[str, Any] | None = None
    missing_info: dict[str, Any] | None = None

    plan: dict[str, Any] | None = None
    milestones: list[dict[str, Any]] = field(default_factory=list)
    plan_versions: list[dict[str, Any]] = field(default_factory=list)

    departments: list[dict[str, Any]] = field(default_factory=list)
    roles: list[dict[str, Any]] = field(default_factory=list)

    risks: list[dict[str, Any]] = field(default_factory=list)

    decisions: list[dict[str, Any]] = field(default_factory=list)
    decision_options: list[dict[str, Any]] = field(default_factory=list)

    devils_advocate: dict[str, Any] | None = None
    success_probability: dict[str, Any] | None = None
    resource_gaps: dict[str, Any] | None = None
    dependency_graph: dict[str, Any] | None = None
    bottlenecks: list[dict[str, Any]] = field(default_factory=list)

    errors: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_prompt_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "objective": {
                "raw": self.objective_raw[:500],
                "status": self.objective_status,
                "stage": self.objective_stage,
            },
        }
        if self.compilation:
            d["compilation"] = self.compilation
        if self.readiness:
            d["readiness"] = self.readiness
        if self.plan:
            d["plan"] = {k: v for k, v in self.plan.items() if k != "versions"}
            d["milestones"] = self.milestones[:20]
        if self.departments:
            d["departments"] = [
                {"name": dept.get("name"), "head_count": dept.get("head_count"),
                 "budget": dept.get("budget"), "roles": dept.get("roles", [])[:5]}
                for dept in self.departments[:10]
            ]
        if self.risks:
            d["risks"] = [
                {"title": r.get("title"), "risk_level": r.get("risk_level"),
                 "probability": r.get("probability"), "impact": r.get("impact")}
                for r in self.risks[:10]
            ]
        if self.decisions:
            d["decisions"] = [
                {"title": dec.get("title"), "status": dec.get("status"),
                 "recommendation": dec.get("recommendation")}
                for dec in self.decisions[:5]
            ]
        if self.devils_advocate:
            d["devils_advocate"] = self.devils_advocate
        return d


class ContextManager:
    def __init__(self) -> None:
        self._contexts: dict[str, ExecutionContext] = {}

    def get_or_create(self, objective_id: str) -> ExecutionContext:
        if objective_id not in self._contexts:
            self._contexts[objective_id] = ExecutionContext(objective_id=objective_id)
        return self._contexts[objective_id]

    def get(self, objective_id: str) -> ExecutionContext | None:
        return self._contexts.get(objective_id)

    def remove(self, objective_id: str) -> None:
        self._contexts.pop(objective_id, None)

    def clear(self) -> None:
        self._contexts.clear()
