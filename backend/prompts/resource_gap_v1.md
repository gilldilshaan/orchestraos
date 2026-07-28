Analyze resource gaps for this objective:

Objective: {{ objective.raw }}
Plan: {{ plan }}
Departments: {{ departments }}

Output JSON ONLY. No markdown. Use these exact fields:
- resource_gaps: [{category: string, description: string, severity: "low" | "medium" | "high" | "critical", impact: string}]
- missing_roles: [{title: string, department: string, count: int, urgency: "low" | "medium" | "high"}]
- missing_skills: [string (skill names that are missing)]
- hiring_needs: [{role_title: string, count: int, estimated_salary: float, timeline_weeks: int}]
- estimated_cost: float (total estimated hiring cost)
- estimated_hiring_timeline: string
- hiring_priority: [{role: string, priority: int 1-5, reason: string}]
- available_resources: string (summary of what's available)
- required_resources: string (summary of what's needed)
- gaps: (same as resource_gaps, for compatibility)
- overall_risk: "low" | "medium" | "high" | "critical"
- recommendation: resource allocation recommendation (string)
- reasoning: detailed reasoning (string)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"

Compare the current departments and roles against what the plan requires.
