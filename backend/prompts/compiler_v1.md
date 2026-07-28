Extract structured business information from this objective:

{{ objective.raw }}

Output JSON ONLY. No markdown, no explanations outside JSON. Use these exact fields:
- mission: core mission statement (string)
- vision: long-term vision (string)
- business_type: type of business initiative (string)
- industry: target industry (string)
- stakeholders: list of {name: string, role: string}
- constraints: list of constraint strings
- kpis: list of {name: string, target: string}
- timeline: {total_months: int, phases: list}
- budget: {total: float, currency: string}
- dependencies: list of dependency strings
- assumptions: list of assumption strings
- risks: list of {title: string, probability: float 0-1, impact: float 0-1}
- success_metrics: list of {name: string, target: string}
- recommendation: the recommended approach (string)
- reasoning: detailed reasoning for the recommendation (string)
- evidence: list of evidence points (strings)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"

Use null for genuinely unknown values. Ensure valid JSON.
