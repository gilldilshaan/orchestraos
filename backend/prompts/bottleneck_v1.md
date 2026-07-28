Scan for bottlenecks in this objective execution:

Objective Status: {{ objective.status }}
Objective Stage: {{ objective.stage }}
Plan: {{ plan }}
Milestones: {{ milestones }}
Departments: {{ departments }}
Risks: {{ risks }}
Existing Bottlenecks: {{ bottlenecks }}

Output JSON with bottlenecks array. Each bottleneck has:
- bottleneck_type: waiting_approval / resource_bottleneck / department_delay / blocked_milestone / critical_task
- severity: critical / high / medium / low
- title: short title
- description: detailed description
- root_cause: identified root cause
- recommended_resolution: actionable resolution
- affected_entity_type: milestone / department / risk (or null)
- affected_entity_id: identifier if known (or null)

Be specific and actionable. Every bottleneck must have a root cause and resolution.
