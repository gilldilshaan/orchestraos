Summarize current execution status for this objective:

Objective Status: {{ objective.status }}
Plan Status: {{ plan.status }}
Milestones Count: {{ milestones_count }}
Risks Count: {{ risks_count }}
Pending Decisions: {{ pending_decisions }}

Output JSON:
- summary: brief execution summary
- progress_percent: 0-100
- status: on_track / at_risk / behind
- alerts: list of alert strings
