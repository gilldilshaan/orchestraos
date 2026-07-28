Summarize current execution status for this objective:

Objective Status: {{ objective.status }}
Plan Status: {{ plan.status }}
Milestones Count: {{ milestones_count }}
Risks Count: {{ risks_count }}
Pending Decisions: {{ pending_decisions }}

Output JSON ONLY. No markdown. Use these exact fields:
- summary: brief execution summary (string)
- progress_percent: int 0-100
- status: "on_track" | "at_risk" | "behind"
- alerts: [string (alert messages)]
- recommendation: recommended next steps (string)
- reasoning: reasoning behind the status assessment (string)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"
