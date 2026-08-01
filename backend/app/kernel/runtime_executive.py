from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.dynamic_org import Capability


class SpecialistRequest(BaseModel):
    """What an executive asks the Agent Factory to create.

    Phase 4 (AgentFactory) will fulfill these requests by spawning
    DynamicAgent instances configured with these parameters.
    """

    title: str
    purpose: str
    required_capabilities: list[Capability] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)


class SpecialistInstance(BaseModel):
    """A spawned specialist's runtime state within an executive."""

    title: str
    executive_title: str
    purpose: str
    task: str = ""
    capabilities: list[Capability] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    status: str = "pending"  # pending | running | completed | failed
    output: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    confidence: float | None = None
    error: str | None = None


class RuntimeExecutive(BaseModel):
    """Runtime state for an executive in the dynamic organization.

    An executive does NOT solve the objective directly. Instead it:
      - owns specialist requests
      - tracks specialist execution
      - collects reports from specialists
      - assigns confidence scores
      - reports upward to the CEO

    Designed for future integration:
      - AgentFactory (Phase 4) fulfills specialist_requests
      - MetaAgent (Phase 8) reads status for bottleneck detection
      - ExecutiveAggregator (Phase 7) enhances aggregation logic
    """

    title: str
    mission: str
    purpose: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    capabilities: list[Capability] = Field(default_factory=list)
    reporting_to: str | None = None

    # Specialist lifecycle
    specialist_requests: list[SpecialistRequest] = Field(default_factory=list)
    specialists: list[SpecialistInstance] = Field(default_factory=list)
    completed_reports: list[dict[str, Any]] = Field(default_factory=list)

    # Execution state
    status: str = "pending"
    output: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    confidence: float | None = None
    error: str | None = None

    def request_specialists(self, llm_output: dict[str, Any]) -> list[SpecialistRequest]:
        """Parse LLM output and create specialist requests.

        Phase 4 (AgentFactory) will fulfill these requests with
        proper capability matching and dynamic agent spawning.
        """
        raw = llm_output.get("specialist_details", [])
        if not raw:
            self.specialist_requests = []
            return []

        requests = [
            SpecialistRequest(
                title=s.get("title", "Specialist"),
                purpose=s.get("purpose", ""),
                required_capabilities=[],
                dependencies=s.get("dependencies", []),
            )
            for s in raw
        ]
        self.specialist_requests = requests
        self.status = "requesting_specialists"
        return requests

    def assign_tasks(self) -> None:
        """Assign task context to each specialist instance.

        Placeholder. Phase 4 (AgentFactory) will handle proper
        task decomposition and work distribution.
        """
        for spec in self.specialists:
            if spec.status == "pending":
                spec.status = "running"

    def receive_report(self, specialist_title: str, report: dict[str, Any]) -> None:
        """Collect a specialist's output.

        Phase 7 (ExecutiveAggregator) will enhance this with
        cross-validation and conflict detection.
        """
        self.completed_reports.append({
            "specialist_title": specialist_title,
            "report": report,
        })
        for spec in self.specialists:
            if spec.title == specialist_title:
                spec.status = "completed"
                spec.output = report
                spec.summary = report.get("summary")
                spec.confidence = report.get("confidence")
                break

    def calculate_confidence(self) -> float:
        """Calculate executive confidence based on specialist outputs.

        Placeholder: averages specialist confidences.
        Phase 7 (ExecutiveAggregator) will provide proper
        confidence calibration across all executives.
        """
        if not self.specialists:
            self.confidence = 0.7
            return 0.7

        confidences = [
            s.confidence for s in self.specialists
            if s.confidence is not None and s.status == "completed"
        ]
        if not confidences:
            self.confidence = 0.7
            return 0.7

        self.confidence = sum(confidences) / len(confidences)
        return self.confidence

    def aggregate_results(self) -> dict[str, Any]:
        """Produce the executive's aggregated output.

        Phase 7 will integrate with ExecutiveAggregator for
        richer aggregation including conflict resolution.
        """
        self.status = "completed"
        return {
            "summary": self.summary or "",
            "confidence": self.confidence,
            "specialist_count": len(self.completed_reports),
            "specialist_summaries": [
                {
                    "title": r["specialist_title"],
                    "summary": r["report"].get("summary", ""),
                    "confidence": r["report"].get("confidence"),
                }
                for r in self.completed_reports
            ],
        }

    def report_to_parent(self) -> dict[str, Any]:
        """Produce upward report for CEO synthesis (Phase 9)."""
        return {
            "title": self.title,
            "mission": self.mission,
            "summary": self.summary or "",
            "confidence": self.confidence or 0.0,
            "specialist_reports": [
                {
                    "title": r["specialist_title"],
                    "summary": r["report"].get("summary", ""),
                }
                for r in self.completed_reports
            ],
            "status": self.status,
        }
