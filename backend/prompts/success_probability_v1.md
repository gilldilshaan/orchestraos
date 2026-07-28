Calculate the success probability for this objective:

Objective: {{ objective.raw }}
Constraints: {{ constraints }}
Success Criteria: {{ objective.success_criteria }}
Confidence: {{ objective.confidence }}
Plan: {{ plan }}
Risks: {{ risks }}

Output JSON ONLY. No markdown. Use these exact fields:
- success_probability: float 0-1 (overall likelihood of success)
- failure_risk: float 0-1 (risk of complete failure)
- delay_risk: float 0-1 (risk of timeline slipping)
- budget_overrun_risk: float 0-1 (risk of exceeding budget)
- team_risk: float 0-1 (risk from team capability/capacity)
- confidence_score: float 0-1 (confidence in this assessment)
- reasoning: detailed explanation of the probability assessment (string)
- overall_score: float 0-1 (same as success_probability, for compatibility)
- factors: [{name: string, impact: float 0-1, description: string}]
- recommendation: recommendation based on probability (string)
- evidence: list of evidence points (strings)
- risk_level: "low", "medium", "high", or "critical"
- assumptions: list of assumptions made (strings)

Be realistic. Most initiatives have a success probability below 0.8.
