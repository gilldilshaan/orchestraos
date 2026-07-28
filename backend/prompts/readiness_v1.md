Assess the business readiness of this objective:

{{ objective.raw }}

Output JSON ONLY. No markdown. Use these exact fields:
- overall_score: int 0-100 (overall business readiness)
- market_readiness: int 0-100 (market opportunity readiness)
- technical_feasibility: int 0-100 (technical capability readiness)
- budget_readiness: int 0-100 (financial resource readiness)
- team_readiness: int 0-100 (team capability readiness)
- timeline_feasibility: int 0-100 (timeline reasonableness)
- strengths: [string (key strength descriptions)]
- weaknesses: [string (key weakness descriptions)]
- recommendations: [string (actionable recommendations)]
- category_scores: {market_opportunity: int, competitive_landscape: int, regulatory: int, tech_stack: int, infrastructure: int, funding: int, cash_flow: int, team_experience: int, team_size: int, hiring_pipeline: int, schedule_feasibility: int, milestone_plan: int}
- recommendation: overall recommendation (string)
- reasoning: detailed reasoning (string)
- evidence: list of evidence points (strings)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"

Score honestly. A score of 100 means no risk in that category.
