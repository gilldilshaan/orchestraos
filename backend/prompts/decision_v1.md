Evaluate strategic options and make a recommendation for this objective:

Objective: {{ objective.raw }}
Compilation: {{ compilation }}
Milestones: {{ milestones }}
Risks: {{ risks }}

Output JSON ONLY. No markdown. Use these exact fields:
- recommendation: the recommended strategic approach (string)
- reasoning: detailed reasoning for the recommendation (string)
- evidence: list of evidence points (strings)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"
- affected_departments: list of department names (strings)
- options: [{
    name: string (option name),
    description: string (brief description),
    pros: [string],
    cons: [string],
    risks: [string],
    cost: float (estimated cost impact),
    timeline_impact: string (how this affects the timeline),
    confidence: float 0-1,
    is_recommended: boolean (only true for the recommended option)
  }]
- assumptions: list of assumptions made (strings)

Provide at least 2-3 distinct strategic options. Be realistic and data-driven.
