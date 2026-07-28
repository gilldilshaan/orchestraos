Analyze dependencies and build a dependency graph:

Objective: {{ objective.raw }}
Plan: {{ plan }}
Milestones: {{ milestones }}
Departments: {{ departments }}
Risks: {{ risks }}

Output JSON with:
- nodes: array of {id, type (milestone/department/task), name, properties}
- edges: array of {source, target, relationship_type, weight}
- critical_path: array of {step, node_id, description} in order
- circular_dependencies: array of {nodes: [], description} or empty array
- blocked_tasks: array of {task, blocked_by, impact, unblock_action}
- cascade_effects: array of {trigger, affected, severity, description}

Identify the longest dependency chain and flag any circular references.
