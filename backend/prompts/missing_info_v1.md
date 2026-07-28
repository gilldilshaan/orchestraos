Analyze this business objective for missing critical information:

{{ objective.raw }}

Check for these fields: budget, timeline, target_audience, team_size, business_model, revenue_model, market, constraints, success_metrics.

Output JSON ONLY. No markdown. Use these exact fields:
- missing_fields: [string (field names that are missing or incomplete)]
- critical_missing: [string (subset of missing_fields that are critical for planning)]
- clarification_questions: [string (specific questions to ask the user)]
- is_complete: boolean (true if no missing fields detected)
- reasoning: reasoning for this assessment (string)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"
