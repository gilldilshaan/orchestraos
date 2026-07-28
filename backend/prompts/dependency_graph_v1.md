Analyze dependencies and build a dependency graph for this objective:

Objective: {{ objective.raw }}
Plan: {{ plan }}
Milestones: {{ milestones }}
Departments: {{ departments }}
Risks: {{ risks }}

Output JSON ONLY. No markdown. Use these exact fields:
- nodes: [{id: string, type: "milestone" | "department" | "task", name: string, properties: {}}]
- edges: [{source: string, target: string, relationship_type: string, weight: float}]
- critical_path: [{step: int, node_id: string, description: string}]
- circular_dependencies: [{nodes: [string], description: string}] (empty array if none)
- blocked_tasks: [{task: string, blocked_by: string, impact: string, unblock_action: string}]
- cascade_effects: [{trigger: string, affected: string, severity: "low" | "medium" | "high", description: string}]
- recommendation: dependency management recommendation (string)
- reasoning: detailed reasoning (string)
- confidence: 0.0 to 1.0
- risk_level: "low", "medium", "high", or "critical"

Identify the longest dependency chain and flag any circular references.
