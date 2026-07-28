Identify and analyze risks for this objective:

Objective: {{ objective.raw }}
Constraints: {{ objective.constraints }}
Existing Risks from Compilation: {{ compilation.risks }}

Output JSON with risks array. Each risk has:
- title: short risk name
- description: detailed description
- category: strategic/operational/market/financial/technical
- probability: 0.0 to 1.0
- impact: 0.0 to 1.0
- risk_level: low/medium/high/critical (based on probability * impact)
- risk_score: probability * impact
- mitigation: strategy to reduce probability or impact
- contingency: plan if risk materializes
- owner: suggested owner role

Cover strategic, operational, market, financial, and technical risk categories.
