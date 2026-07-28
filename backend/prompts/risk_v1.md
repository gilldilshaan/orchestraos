Identify and analyze risks for this objective:

Objective: {{ objective.raw }}
Constraints: {{ constraints }}
Existing Risks from Compilation: {{ compilation.risks }}

Output JSON ONLY. No markdown. Use these exact fields:
- risks: [{
    title: string,
    description: string,
    category: "strategic" | "operational" | "market" | "financial" | "technical",
    probability: float 0-1,
    impact: float 0-1,
    risk_level: "low" | "medium" | "high" | "critical",
    risk_score: float (probability * impact),
    mitigation: string,
    contingency: string,
    owner: string (suggested role)
  }]
- recommendation: overall risk management recommendation (string)
- reasoning: detailed reasoning for risk assessment (string)
- evidence: list of evidence points (strings)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"
- assumptions: list of assumptions made (strings)
- affected_departments: list of department names (strings)

Cover strategic, operational, market, financial, and technical risk categories. Be realistic.
