from __future__ import annotations

from pydantic import BaseModel, Field

from app.kernel.reporting import OrganizationReport

# ── Typed Decision Models ────────────────────────────────────────────────────


class DecisionOption(BaseModel):
    """A single considered option during decision-making."""

    title: str
    description: str = ""
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class DecisionTradeoff(BaseModel):
    """A trade-off between two options that was evaluated."""

    description: str = ""
    option_a: str = ""
    option_b: str = ""
    recommendation: str = ""
    rationale: str = ""


class DecisionReview(BaseModel):
    """A review of a specific area during decision-making."""

    area: str = ""  # "executive" | "conflict" | "health" | "confidence"
    verdict: str = "approved"  # "approved" | "flagged" | "needs_attention"
    details: str = ""


class DecisionConfidence(BaseModel):
    """Confidence breakdown for the final decision."""

    overall: float = 0.0
    supporting_count: int = 0
    conflicting_count: int = 0
    risk_level: str = "medium"  # "low" | "medium" | "high"


class ExecutiveDecision(BaseModel):
    """The final decision produced by the Executive Decision Engine.

    Represents how a CEO would reason through the full organization report.
    """

    executive_summary: str = ""
    supporting_evidence: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    tradeoffs: list[DecisionTradeoff] = Field(default_factory=list)
    confidence: DecisionConfidence = Field(default_factory=DecisionConfidence)
    rejected_alternatives: list[str] = Field(default_factory=list)
    recommended_action: str = ""
    future_work: list[str] = Field(default_factory=list)
    reviews: list[DecisionReview] = Field(default_factory=list)

    # Future memory extension point
    memory_references: list[str] = Field(default_factory=list)
    recalled_decisions: list[str] = Field(default_factory=list)


# ── Executive Decision Engine ───────────────────────────────────────────────


class ExecutiveDecisionEngine:
    """Evaluates the full organization and produces a reasoned decision.

    Receives the OrganizationReport (including supervisor analyses, conflicts,
    health metrics) and applies structured heuristics that mirror how a CEO
    would review and decide.

    No LLM calls — all logic is rule-based for reliability and auditability.
    LLM integration is a future extension point.
    """

    def __init__(self, report: OrganizationReport) -> None:
        self._report = report
        self._reviews: list[DecisionReview] = []
        self._tradeoffs: list[DecisionTradeoff] = []
        self._evidence: list[str] = []
        self._risks: list[str] = []
        self._rejected: list[str] = []

    # ── Public API ───────────────────────────────────────────────────────

    def review_reports(self) -> list[DecisionReview]:
        """Review each executive report for quality and completeness."""
        reviews: list[DecisionReview] = []
        for er in self._report.executive_reports:
            verdict = "approved"
            details_parts: list[str] = []

            if not er.execution_summary:
                verdict = "needs_attention"
                details_parts.append("No execution summary")

            if not er.aggregated_findings:
                if verdict == "approved":
                    verdict = "flagged"
                details_parts.append("No aggregated findings")

            if er.confidence <= 0:
                if verdict == "approved":
                    verdict = "flagged"
                details_parts.append("Confidence not reported")

            if er.confidence > 0 and er.confidence < 0.4:
                if verdict == "approved":
                    verdict = "flagged"
                details_parts.append(f"Low confidence ({er.confidence:.2f})")

            details = "; ".join(details_parts) if details_parts else "All checks passed"
            reviews.append(DecisionReview(
                area="executive",
                verdict=verdict,
                details=f"Executive '{er.executive_title}': {details}",
            ))

        self._reviews.extend(reviews)
        return reviews

    def review_conflicts(self) -> list[DecisionReview]:
        """Review all conflicts detected across the organization."""
        reviews: list[DecisionReview] = []
        high_severity = 0
        for c in self._report.conflicts:
            verdict = "flagged" if c.severity in ("high", "medium") else "needs_attention"
            reviews.append(DecisionReview(
                area="conflict",
                verdict=verdict,
                details=f"[{c.severity}] {c.type}: {c.description}",
            ))
            if c.severity == "high":
                high_severity += 1

        if not self._report.conflicts:
            reviews.append(DecisionReview(
                area="conflict",
                verdict="approved",
                details="No conflicts detected across the organization",
            ))

        if high_severity > 0:
            self._risks.append(
                f"{high_severity} high-severity conflict(s) require resolution"
            )

        self._reviews.extend(reviews)
        return reviews

    def review_health(self) -> list[DecisionReview]:
        """Review the overall organization health."""
        reviews: list[DecisionReview] = []
        hs = self._report.health_score

        if hs >= 0.8:
            verdict = "approved"
            details = f"Organization health is strong ({hs:.2f})"
        elif hs >= 0.5:
            verdict = "flagged"
            details = f"Organization health is degraded ({hs:.2f})"
            self._risks.append(f"Health score {hs:.2f} indicates degraded performance")
        else:
            verdict = "needs_attention"
            details = f"Organization health is critical ({hs:.2f})"
            self._risks.append(f"Health score {hs:.2f} is critical — intervention required")

        if self._report.bottlenecks:
            details += f"; {len(self._report.bottlenecks)} bottleneck(s) detected"
            self._risks.append(f"{len(self._report.bottlenecks)} bottleneck(s) may slow execution")

        reviews.append(DecisionReview(area="health", verdict=verdict, details=details))
        self._reviews.extend(reviews)
        return reviews

    def evaluate_tradeoffs(self) -> list[DecisionTradeoff]:
        """Identify trade-offs between conflicting approaches.

        Looks for conflicting recommendations and presents them as
        structured trade-offs with a recommended direction.
        """
        tradeoffs: list[DecisionTradeoff] = []

        # Collect all recommendations from all executives
        exec_recs: list[tuple[str, list[str]]] = []
        for er in self._report.executive_reports:
            all_recs: list[str] = list(er.aggregated_findings)
            for sr in er.specialist_reports:
                all_recs.extend(sr.recommendations)
            if all_recs:
                exec_recs.append((er.executive_title, all_recs))

        # Pair executives and find conflicting directions
        for i in range(len(exec_recs)):
            for j in range(i + 1, len(exec_recs)):
                a_title, a_recs = exec_recs[i]
                b_title, b_recs = exec_recs[j]
                a_keywords = {w for r in a_recs for w in r.lower().split()}
                b_keywords = {w for r in b_recs for w in r.lower().split()}

                conflict_keywords = {"increase", "reduce", "invest", "cut", "expand", "consolidate"}
                a_conflict = a_keywords & conflict_keywords
                b_conflict = b_keywords & conflict_keywords

                if a_conflict and b_conflict and a_conflict != b_conflict:
                    tradeoffs.append(DecisionTradeoff(
                        description=f"Strategic tension between '{a_title}' and '{b_title}'",
                        option_a=f"{a_title} focuses on: {', '.join(a_conflict)}",
                        option_b=f"{b_title} focuses on: {', '.join(b_conflict)}",
                        recommendation=(
                            "Resolve through CEO synthesis — "
                            "both directions may be valid"
                        ),
                        rationale=(
                            "Different executives may have valid "
                            "but opposing strategic priorities"
                        ),
                    ))

        # Add a trade-off for every high-severity conflict
        for c in self._report.conflicts:
            if c.severity == "high":
                sources = c.sources or ["unknown"]
                tradeoffs.append(DecisionTradeoff(
                    description=c.description,
                    option_a=f"Adopt recommendation from '{sources[0]}'",
                    option_b=(
                        f"Adopt recommendation from '{sources[-1]}'"
                        if len(sources) > 1
                        else "Reject both"
                    ),
                    recommendation="Escalate for CEO review",
                    rationale=f"High-severity conflict: {c.type}",
                ))

        self._tradeoffs.extend(tradeoffs)
        return tradeoffs

    def generate_decision(self) -> ExecutiveDecision:
        """Run all reviews and produce the final ExecutiveDecision."""
        self.review_reports()
        self.review_conflicts()
        self.review_health()
        self.evaluate_tradeoffs()

        # Collect supporting evidence from executive reports
        for er in self._report.executive_reports:
            for finding in er.aggregated_findings[:3]:
                self._evidence.append(f"[{er.executive_title}] {finding}")

        # Identify rejected alternatives from conflicts and trade-offs
        for c in self._report.conflicts:
            if c.severity == "high":
                for src in c.sources:
                    self._rejected.append(
                        f"Recommendation from '{src}' rejected due to {c.type}"
                    )

        summary = self._report.final_summary or "No executive summary available"
        confidence = self._compute_confidence()
        recommended_action = self._recommend_action()

        # Collect future work items from supervisor
        future_work: list[str] = []
        for sa in self._report.supervisor_analyses:
            for bn in sa.get("bottlenecks", []):
                future_work.append(f"Resolve bottleneck: {bn}")
            for idle_item in sa.get("idle", []):
                future_work.append(f"Address idle specialist: {idle_item}")
            for dup in sa.get("duplicates", []):
                future_work.append(f"Resolve duplicate work: {dup}")

        return ExecutiveDecision(
            executive_summary=summary,
            supporting_evidence=self._evidence,
            risks=self._risks,
            tradeoffs=self._tradeoffs,
            confidence=confidence,
            rejected_alternatives=self._rejected,
            recommended_action=recommended_action,
            future_work=future_work,
            reviews=self._reviews,
        )

    # ── Internal helpers ─────────────────────────────────────────────────

    def _compute_confidence(self) -> DecisionConfidence:
        """Calculate final confidence based on all signals."""
        report_conf = self._report.confidence
        health = self._report.health_score
        conflict_count = len(self._report.conflicts)
        exec_count = len(self._report.executive_reports)
        supporting = sum(
            1 for er in self._report.executive_reports
            if er.confidence >= 0.6
        )

        base = report_conf * 0.4 + health * 0.3
        exec_factor = min(1.0, exec_count / 3) * 0.15
        conflict_penalty = min(1.0, conflict_count * 0.1) * 0.15
        overall = max(0.0, min(1.0, base + exec_factor - conflict_penalty))

        risk_level = "low"
        if overall < 0.4 or conflict_count > 2:
            risk_level = "high"
        elif overall < 0.7 or conflict_count > 0:
            risk_level = "medium"

        return DecisionConfidence(
            overall=overall,
            supporting_count=supporting,
            conflicting_count=conflict_count,
            risk_level=risk_level,
        )

    def _recommend_action(self) -> str:
        """Determine the recommended action from available data."""
        if self._report.health_score < 0.5:
            return (
                "Pause and address critical health issues before proceeding. "
                "Review supervisor recommendations and resolve high-severity conflicts."
            )
        if len(self._report.conflicts) > 2:
            return (
                "Proceed with caution. Multiple conflicts require attention. "
                "Delegate conflict resolution to the affected executives."
            )
        if self._report.confidence >= 0.7 and self._report.health_score >= 0.8:
            return (
                "Approve and proceed with full execution. "
                "Monitor health metrics and re-evaluate at next checkpoint."
            )
        return (
            "Proceed with monitoring. "
            "Address flagged items and re-evaluate after next executive cycle."
        )
