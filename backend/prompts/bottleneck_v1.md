Scan for bottlenecks in this objective execution:

Objective Status: {{ objective.status }}
Objective Stage: {{ objective.stage }}
Plan: {{ plan }}
Milestones: {{ milestones }}
Departments: {{ departments }}
Risks: {{ risks }}
Existing Bottlenecks: {{ bottlenecks }}

Output JSON ONLY. No markdown. Use these exact fields:
- bottlenecks: [{
    bottleneck_type: "waiting_approval" | "resource_bottleneck" | "department_delay" | "blocked_milestone" | "critical_task",
    severity: "critical" | "high" | "medium" | "low",
    title: string,
    description: string,
    root_cause: string,
    recommended_resolution: string,
    impact: string,
    recommendation: string,
    affected_entity_type: "milestone" | "department" | "risk" | null,
    affected_entity_id: string | null
  }]
- reasoning: reasoning for bottleneck identification (string)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"

Be specific and actionable. Every bottleneck must have a root cause and resolution.
