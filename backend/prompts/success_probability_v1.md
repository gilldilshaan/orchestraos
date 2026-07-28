Calculate the success probability for this objective:

Objective: {{ objective.raw }}
Constraints: {{ objective.constraints }}
Success Criteria: {{ objective.success_criteria }}
Confidence: {{ objective.confidence }}
Plan: {{ plan }}
Risks: {{ risks }}

Output JSON with:
- success_probability: 0.0 to 1.0 overall likelihood of success
- failure_risk: 0.0 to 1.0 risk of complete failure
- delay_risk: 0.0 to 1.0 risk of timeline slipping
- budget_overrun_risk: 0.0 to 1.0 risk of exceeding budget
- team_risk: 0.0 to 1.0 risk from team capability/capacity
- confidence_score: 0.0 to 1.0 confidence in this assessment
- reasoning: detailed explanation of the probability assessment
- risk_factors: list of {factor, impact, mitigation} objects
- mitigating_factors: list of {factor, impact, value} objects

Be realistic. Most initiatives have a success probability below 0.8.
