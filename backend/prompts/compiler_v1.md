Extract structured business information from this objective:

{{ objective.raw }}

Output JSON with these fields:
- mission: the core mission statement
- vision: the long-term vision
- business_type: type of business initiative
- industry: target industry
- stakeholders: list of objects with name/role
- constraints: list of constraints
- kpis: list of objects with name/target
- timeline: object with total_months/phases
- budget: object with total/currency
- dependencies: list of dependencies
- assumptions: list of assumptions
- risks: list of objects with title/probability/impact
- success_metrics: list of objects with name/target

Ensure all fields are populated. Use null for genuinely unknown values.
