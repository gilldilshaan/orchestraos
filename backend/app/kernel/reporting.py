from __future__ import annotations

import time
from typing import Any, Literal

from pydantic import BaseModel, Field

ConflictType = Literal[
    "conflicting_recommendations",
    "duplicate_work",
    "confidence_disagreement",
    "missing_information",
    "unknown",
]

ConflictSeverity = Literal["low", "medium", "high"]

# ── Report Models ────────────────────────────────────────────────────────────


class SpecialistReport(BaseModel):
    """Typed report produced by a single specialist execution."""

    specialist_id: str
    title: str
    executive: str
    confidence: float = 0.0
    execution_time: float = 0.0
    token_usage: dict[str, int] = Field(default_factory=dict)
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExecutiveReport(BaseModel):
    """Aggregated report produced by an executive after all specialists report."""

    executive_id: str
    executive_title: str
    specialist_reports: list[SpecialistReport] = Field(default_factory=list)
    aggregated_findings: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    execution_summary: str = ""


class ConflictInfo(BaseModel):
    """Describes a detected conflict between reports at any level."""

    type: ConflictType = "unknown"
    description: str = ""
    sources: list[str] = Field(default_factory=list)
    severity: ConflictSeverity = "medium"


class OrganizationReport(BaseModel):
    """Final report produced by the CEO after all executives report."""

    executive_reports: list[ExecutiveReport] = Field(default_factory=list)
    conflicts: list[ConflictInfo] = Field(default_factory=list)
    confidence: float = 0.0
    final_summary: str = ""
    recommendations: list[str] = Field(default_factory=list)
    execution_metrics: dict[str, Any] = Field(default_factory=dict)
    supervisor_analyses: list[dict[str, Any]] = Field(default_factory=list)
    supervisor_actions: list[dict[str, Any]] = Field(default_factory=list)
    health_score: float = 1.0
    bottlenecks: list[str] = Field(default_factory=list)


# ── Conflict Detection ───────────────────────────────────────────────────────


class ConflictDetector:
    """Detects conflicts between reports at the specialist and executive levels.

    Each method returns a list of ConflictInfo objects.  Detection logic is
    intentionally simple — the Meta-Agent (Phase 8) will add LLM-driven
    cross-analysis.
    """

    @staticmethod
    def detect_conflicting_recommendations(
        reports: list[SpecialistReport],
    ) -> list[ConflictInfo]:
        """Flag contradictory recommendations across specialists."""
        conflicts: list[ConflictInfo] = []
        all_recs: list[tuple[str, str]] = []
        for r in reports:
            for rec in r.recommendations:
                all_recs.append((r.title, rec.lower()))

        for i in range(len(all_recs)):
            for j in range(i + 1, len(all_recs)):
                a_title, a_rec = all_recs[i]
                b_title, b_rec = all_recs[j]
                keywords = ["increase", "reduce", "remove", "add", "invest", "cut"]
                for kw in keywords:
                    if kw in a_rec and ("don't " + kw) in b_rec:
                        conflicts.append(ConflictInfo(
                            type="conflicting_recommendations",
                            description=(
                                f"'{a_title}' recommends {kw} but "
                                f"'{b_title}' recommends against it"
                            ),
                            sources=[a_title, b_title],
                            severity="high",
                        ))
                        break
        return conflicts

    @staticmethod
    def detect_duplicate_work(
        reports: list[SpecialistReport],
    ) -> list[ConflictInfo]:
        """Flag reports with overlapping findings."""
        conflicts: list[ConflictInfo] = []
        for i in range(len(reports)):
            for j in range(i + 1, len(reports)):
                a_findings = {f.lower().strip(" .") for f in reports[i].findings}
                b_findings = {f.lower().strip(" .") for f in reports[j].findings}
                overlap = a_findings & b_findings
                if len(overlap) >= 2:
                    conflicts.append(ConflictInfo(
                        type="duplicate_work",
                        description=(
                            f"'{reports[i].title}' and '{reports[j].title}' "
                            f"have {len(overlap)} overlapping findings"
                        ),
                        sources=[reports[i].title, reports[j].title],
                        severity="medium",
                    ))
        return conflicts

    @staticmethod
    def detect_confidence_disagreement(
        reports: list[SpecialistReport],
    ) -> list[ConflictInfo]:
        """Flag significant confidence gaps across specialists."""
        conflicts: list[ConflictInfo] = []
        if not reports:
            return conflicts
        confidences = [(r.title, r.confidence) for r in reports if r.confidence > 0]
        if len(confidences) < 2:
            return conflicts
        max_conf = max(c for _, c in confidences)
        min_conf = min(c for _, c in confidences)
        if max_conf - min_conf > 0.5:
            low_reps = [t for t, c in confidences if c == min_conf]
            high_reps = [t for t, c in confidences if c == max_conf]
            conflicts.append(ConflictInfo(
                type="confidence_disagreement",
                    description=(
                        f"Confidence ranges from {min_conf:.1f} to "
                        f"{max_conf:.1f} across specialists"
                    ),
                sources=low_reps + high_reps,
                severity="medium",
            ))
        return conflicts

    @staticmethod
    def detect_missing_information(
        reports: list[SpecialistReport],
    ) -> list[ConflictInfo]:
        """Flag reports that lack key fields."""
        conflicts: list[ConflictInfo] = []
        for r in reports:
            missing: list[str] = []
            if not r.findings:
                missing.append("findings")
            if not r.recommendations:
                missing.append("recommendations")
            if r.confidence <= 0:
                missing.append("confidence")
            if missing:
                conflicts.append(ConflictInfo(
                    type="missing_information",
                    description=f"'{r.title}' missing: {', '.join(missing)}",
                    sources=[r.title],
                    severity="low",
                ))
        return conflicts

    @classmethod
    def detect_all(cls, reports: list[SpecialistReport]) -> list[ConflictInfo]:
        """Run all conflict detectors."""
        return (
            cls.detect_conflicting_recommendations(reports)
            + cls.detect_duplicate_work(reports)
            + cls.detect_confidence_disagreement(reports)
            + cls.detect_missing_information(reports)
        )


# ── Executive Aggregator ─────────────────────────────────────────────────────

class ExecutiveAggregator:
    """Collects specialist reports and produces an ExecutiveReport.

    Flow:
      1. receive_specialist_report() for each completed specialist
      2. aggregate() to combine and synthesize
      3. produce_report() to get the final ExecutiveReport
    """

    def __init__(self, executive_id: str, executive_title: str) -> None:
        self._executive_id = executive_id
        self._executive_title = executive_title
        self._specialist_reports: list[SpecialistReport] = []
        self._started_at = time.monotonic()

    def receive_specialist_report(self, report: SpecialistReport) -> None:
        """Accept a completed specialist report."""
        self._specialist_reports.append(report)

    def calculate_confidence(self) -> float:
        """Weighted average confidence across all specialists."""
        if not self._specialist_reports:
            return 0.0
        total = sum(r.confidence for r in self._specialist_reports if r.confidence > 0)
        count = sum(1 for r in self._specialist_reports if r.confidence > 0)
        return total / count if count > 0 else 0.0

    def detect_conflicts(self) -> list[ConflictInfo]:
        """Run conflict detection across all specialist reports."""
        return ConflictDetector.detect_all(self._specialist_reports)

    def aggregate(self) -> dict[str, Any]:
        """Combine specialist reports into an aggregated view.

        Merges findings, recommendations, and risks from all specialists.
        Returns a dict consumed by produce_report().
        """
        all_findings: list[str] = []
        all_recommendations: list[str] = []
        all_risks: list[str] = []

        for r in self._specialist_reports:
            all_findings.extend(r.findings)
            all_recommendations.extend(r.recommendations)

        return {
            "aggregated_findings": list(dict.fromkeys(all_findings)),
            "recommendations": list(dict.fromkeys(all_recommendations)),
            "risks": all_risks,
        }

    def produce_report(
        self,
        execution_summary: str = "",
    ) -> ExecutiveReport:
        """Produce the final ExecutiveReport."""
        agg = self.aggregate()
        confidence = self.calculate_confidence()

        return ExecutiveReport(
            executive_id=self._executive_id,
            executive_title=self._executive_title,
            specialist_reports=list(self._specialist_reports),
            aggregated_findings=agg["aggregated_findings"],
            risks=agg["risks"],
            confidence=confidence,
            execution_summary=execution_summary,
        )


# ── CEO Aggregator ───────────────────────────────────────────────────────────

class CEOAggregator:
    """Collects executive reports and produces an OrganizationReport.

    Flow:
      1. receive_executive_report() for each completed executive
      2. detect_conflicts() across executives
      3. merge_reports() to produce the final OrganizationReport
      4. produce_organization_report() to get the final result
    """

    def __init__(self) -> None:
        self._executive_reports: list[ExecutiveReport] = []

    def receive_executive_report(self, report: ExecutiveReport) -> None:
        """Accept a completed executive report."""
        self._executive_reports.append(report)

    def detect_conflicts(self) -> list[ConflictInfo]:
        """Detect conflicts at the executive level.

        Currently wraps specialist-level conflict detection across all
        specialists in all executives. Future: executive-level analysis.
        """
        all_specialist_reports: list[SpecialistReport] = []
        for er in self._executive_reports:
            all_specialist_reports.extend(er.specialist_reports)
        return ConflictDetector.detect_all(all_specialist_reports)

    def calculate_global_confidence(self) -> float:
        """Average confidence across all executive reports."""
        if not self._executive_reports:
            return 0.0
        total = sum(r.confidence for r in self._executive_reports if r.confidence > 0)
        count = sum(1 for r in self._executive_reports if r.confidence > 0)
        return total / count if count > 0 else 0.0

    def merge_reports(
        self,
        final_summary: str = "",
        recommendations: list[str] | None = None,
        supervisor_analyses: list[dict[str, Any]] | None = None,
        supervisor_actions: list[dict[str, Any]] | None = None,
        health_score: float = 1.0,
        bottlenecks: list[str] | None = None,
    ) -> OrganizationReport:
        """Produce the final OrganizationReport from all executive reports."""
        conflicts = self.detect_conflicts()
        confidence = self.calculate_global_confidence()
        exec_metrics = {
            "executive_count": len(self._executive_reports),
            "total_specialist_reports": sum(
                len(er.specialist_reports) for er in self._executive_reports
            ),
            "conflict_count": len(conflicts),
        }

        return OrganizationReport(
            executive_reports=list(self._executive_reports),
            conflicts=conflicts,
            confidence=confidence,
            final_summary=final_summary,
            recommendations=recommendations or [],
            execution_metrics=exec_metrics,
            supervisor_analyses=supervisor_analyses or [],
            supervisor_actions=supervisor_actions or [],
            health_score=health_score,
            bottlenecks=bottlenecks or [],
        )

    def produce_organization_report(
        self,
        final_summary: str = "",
        recommendations: list[str] | None = None,
        supervisor_analyses: list[dict[str, Any]] | None = None,
        supervisor_actions: list[dict[str, Any]] | None = None,
        health_score: float = 1.0,
        bottlenecks: list[str] | None = None,
    ) -> OrganizationReport:
        """Convenience wrapper — merge + detect conflicts in one call."""
        return self.merge_reports(
            final_summary=final_summary,
            recommendations=recommendations,
            supervisor_analyses=supervisor_analyses,
            supervisor_actions=supervisor_actions,
            health_score=health_score,
            bottlenecks=bottlenecks,
        )


# ── Conversion Helpers ───────────────────────────────────────────────────────


def specialist_report_from_output(
    specialist_id: str,
    title: str,
    executive: str,
    output: dict[str, Any],
    execution_time: float = 0.0,
) -> SpecialistReport:
    """Build a SpecialistReport from a raw DynamicAgent output dict."""
    token_usage: dict[str, int] = {}
    raw_output_str = str(output)
    token_usage["estimated_input"] = len(raw_output_str) // 4
    token_usage["estimated_output"] = len(raw_output_str) // 4

    findings = output.get("findings", [])
    if not findings and output.get("summary"):
        findings = [output["summary"]]

    recommendations = output.get("recommendations", [])
    if not recommendations and output.get("next_steps"):
        recommendations = output["next_steps"]

    return SpecialistReport(
        specialist_id=specialist_id,
        title=title,
        executive=executive,
        confidence=output.get("confidence", 0.0),
        execution_time=execution_time,
        token_usage=token_usage,
        findings=findings if isinstance(findings, list) else [str(findings)],
        recommendations=(
            recommendations if isinstance(recommendations, list)
            else [str(recommendations)]
        ),
        metadata={"raw_output": str(output)[:500]},
    )
