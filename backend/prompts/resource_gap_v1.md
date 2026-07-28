Analyze resource gaps for this objective:

Objective: {{ objective.raw }}
Plan: {{ plan }}
Available Resources: {{ departments }}

Output JSON with:
- missing_roles: array of {title, department, count, urgency} objects
- missing_skills: list of skill names that are missing
- hiring_needs: array of {role_title, count, estimated_salary, timeline_weeks} objects
- estimated_cost: total estimated hiring cost (float)
- estimated_hiring_timeline: string describing timeline
- hiring_priority: array of {role, priority (1-5), reason} objects
- available_resources: summary of what's available
- required_resources: summary of what's needed

Compare the current departments and roles against what the plan requires.
