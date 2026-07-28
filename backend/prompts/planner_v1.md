Create an execution plan for this objective:

Objective: {{ objective.raw }}
Compilation: {{ compilation }}
Constraints: {{ constraints }}

Output JSON ONLY. No markdown. Use these exact fields:
- roadmap: {phases: [{phase_number: int, name: string, duration_months: int, milestones: [string]}]}
- timeline: {total_months: int, start_date: string}
- total_cost: numeric estimate (float)
- confidence: 0.0 to 1.0
- milestones: [{name: string, description: string, order: int, status: "pending", dependencies: [string], kpis: [string]}]
- recommendation: the recommended plan approach (string)
- reasoning: detailed reasoning for this plan (string)
- evidence: list of evidence points (strings)
- risk_level: "low", "medium", "high", or "critical"
- assumptions: list of assumptions made (strings)

Consider budget, timeline, and constraints when designing the plan.
