Run a detailed what-if scenario simulation with these parameter changes:

Parameters: {{ parameters }}

Against this current context:
Plan: {{ plan_snapshot }}
Objective: {{ objective.raw }}

Output JSON ONLY. No markdown. Use these exact fields:
- scenario_name: string (name for this scenario)
- description: string (detailed scenario description)
- success_probability: float 0-1
- timeline_impact: string
- resource_impact: string
- risk_profile: "low" | "medium" | "high" | "critical"
- results: {
    new_timeline: {total_months: int, details: string},
    new_cost: float,
    new_risks: [string],
    new_success_probability: float 0-1,
    recommended_strategy: string,
    key_insights: [string]
  }
- comparison: {
    timeline_change: string,
    cost_change: string,
    risk_change: string,
    success_probability_change: float (delta from original),
    trade_offs: [string]
  }
- recommended_actions: [string]
- trade_offs: [string]
- comparison_to_current: string
- recommendation: recommended approach (string)
- reasoning: detailed reasoning (string)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"

Focus on realistic outcomes based on the parameter changes.
