Create an execution plan for this objective:

Objective: {{ objective.raw }}
Compilation: {{ compilation }}
Constraints: {{ objective.constraints }}

Output JSON with:
- roadmap: object with phases array (each with phase number, name, duration_months, milestones)
- timeline: object with total_months and start_date
- total_cost: numeric estimate
- confidence: 0.0 to 1.0
- milestones: array of objects with name, description, order (1-based), status ("pending"), dependencies, kpis

Consider the budget, timeline, and constraints when designing the plan.
