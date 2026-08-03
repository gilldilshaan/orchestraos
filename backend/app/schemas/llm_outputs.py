"""Pydantic schemas for validating raw AI-generated output before it reaches
repositories. These are intentionally permissive on nested structures (kept as
list[dict]/dict) so a single malformed nested field cannot wipe out an entire
agent result in OutputValidator.validate_schema — but they still catch wrong
top-level types (e.g. confidence returned as a string) and enforce enums.

Not related to app/schemas/__init__.py, which models API request/response
shapes. These model the AIKernel.run() -> raw LLM/fallback JSON contract.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high", "critical"]


class PlanOutputSchema(BaseModel):
    roadmap: dict[str, Any] | None = None
    timeline: dict[str, Any] | None = None
    total_cost: float | None = None
    confidence: float | None = None
    milestones: list[dict[str, Any]] = Field(default_factory=list)
    recommendation: str | None = None
    reasoning: str | None = None
    evidence: list[str] = Field(default_factory=list)
    risk_level: RiskLevel | None = None
    assumptions: list[str] = Field(default_factory=list)
    memory_references: list[dict[str, Any]] = Field(default_factory=list)


class RiskOutputSchema(BaseModel):
    risks: list[dict[str, Any]] = Field(default_factory=list)
    recommendation: str | None = None
    reasoning: str | None = None
    evidence: list[str] = Field(default_factory=list)
    confidence: float | None = None
    risk_level: RiskLevel | None = None
    assumptions: list[str] = Field(default_factory=list)
    affected_departments: list[str] = Field(default_factory=list)


class OrganizationOutputSchema(BaseModel):
    departments: list[dict[str, Any]] = Field(default_factory=list)
    recommendation: str | None = None
    reasoning: str | None = None
    evidence: list[str] = Field(default_factory=list)
    confidence: float | None = None
    risk_level: RiskLevel | None = None
    assumptions: list[str] = Field(default_factory=list)


class DecisionOutputSchema(BaseModel):
    recommendation: str | None = None
    reasoning: str | None = None
    evidence: list[str] = Field(default_factory=list)
    confidence: float | None = None
    risk_level: RiskLevel | None = None
    affected_departments: list[str] = Field(default_factory=list)
    options: list[dict[str, Any]] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class DevilsAdvocateOutputSchema(BaseModel):
    critique_score: int | None = None
    counter_arguments: list[dict[str, Any]] = Field(default_factory=list)
    risks: list[dict[str, Any]] = Field(default_factory=list)
    assumptions: list[dict[str, Any]] = Field(default_factory=list)
    better_alternatives: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    reasoning: str | None = None
    evidence: list[str] = Field(default_factory=list)
    confidence: float | None = None
    risk_level: RiskLevel | None = None


class DependencyGraphOutputSchema(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    critical_path: list[dict[str, Any]] = Field(default_factory=list)
    circular_dependencies: list[dict[str, Any]] = Field(default_factory=list)
    blocked_tasks: list[dict[str, Any]] = Field(default_factory=list)
    cascade_effects: list[dict[str, Any]] = Field(default_factory=list)
    recommendation: str | None = None
    reasoning: str | None = None
    confidence: float | None = None
    risk_level: RiskLevel | None = None


class DashboardOutputSchema(BaseModel):
    summary: str | None = None
    progress_percent: int | None = None
    status: Literal["on_track", "at_risk", "behind"] | None = None
    alerts: list[str] = Field(default_factory=list)
    recommendation: str | None = None
    reasoning: str | None = None
    confidence: float | None = None
    risk_level: RiskLevel | None = None
