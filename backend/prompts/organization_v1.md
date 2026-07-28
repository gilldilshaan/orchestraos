Generate an organizational structure for this objective:

Business Type: {{ compilation.business_type }}
Industry: {{ compilation.industry }}
Budget: {{ compilation.budget }}
Plan: {{ plan }}

Output JSON ONLY. No markdown. Use these exact fields:
- departments: [{
    name: string (department name),
    description: string (what this department does),
    head_count: int (number of people needed),
    budget: float (allocated budget),
    roles: [{
      title: string,
      description: string,
      responsibilities: [string],
      required_skills: [string],
      hiring_order: int (1 = hire first),
      head_count: int (people in this role)
    }]
  }]
- recommendation: organizational structure recommendation (string)
- reasoning: detailed reasoning for this structure (string)
- evidence: list of evidence points (strings)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"
- assumptions: list of assumptions made (strings)

Create departments that make sense for the business type and industry.
