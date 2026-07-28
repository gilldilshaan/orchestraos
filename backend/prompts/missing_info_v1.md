Analyze this business objective for missing critical information:

{{ objective.raw }}

Check for these fields: budget, timeline, target_audience, team_size, business_model, revenue_model, market, constraints, success_metrics.

Output JSON with:
- missing_fields: list of field names that are missing or incomplete
- critical_missing: subset of missing_fields that are critical for planning
- clarification_questions: list of specific questions to ask the user to fill in the missing information
- is_complete: boolean (true if no missing fields detected)
