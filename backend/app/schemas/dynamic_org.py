from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Capability(BaseModel):
    """A capability required or possessed by a role."""

    name: str
    description: str
    proficiency: str = "intermediate"  # "expert" | "intermediate" | "beginner"


class OrganizationIntelligence(BaseModel):
    """Output of the Intelligence Engine — pure analysis, no solutions."""

    domain: str
    complexity: str  # "low" | "medium" | "high"
    required_capabilities: list[Capability] = Field(default_factory=list)
    estimated_team_size: int = 3
    reasoning: str = ""


class SpecialistRole(BaseModel):
    title: str
    purpose: str
    responsibilities: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    expected_output: str | None = None


class ExecutiveRole(BaseModel):
    title: str
    purpose: str
    responsibilities: list[str] = Field(default_factory=list)
    requires_specialists: bool = False
    required_specialists: list[str] = Field(default_factory=list)
    children: list[SpecialistRole] = Field(default_factory=list)


class DynamicOrganizationStructure(BaseModel):
    company_name: str
    industry: str
    executives: list[ExecutiveRole] = Field(default_factory=list)


class DynamicOrgResult(BaseModel):
    """Result from a single role execution in the org hierarchy."""

    title: str
    role_type: str  # "executive" | "specialist"
    output: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    child_results: list[DynamicOrgResult] = Field(default_factory=list)
    status: str = "completed"
    error: str | None = None
