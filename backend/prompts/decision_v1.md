Evaluate strategic options and make a recommendation for this objective:

Objective: {{ objective.raw }}
Compilation: {{ compilation }}
Milestones: {{ milestones }}
Risks: {{ risks }}

Output JSON with:
- recommendation: the recommended strategic approach
- reasoning: detailed reasoning for the recommendation
- evidence: list of evidence points supporting this
- confidence: 0.0 to 1.0
- risk_level: low/medium/high/critical
- affected_departments: list of department names impacted
- options: array of objects each with:
  - name: option name
  - description: brief description
  - pros: list of advantages
  - cons: list of disadvantages
  - risks: list of risks for this option
  - cost: estimated cost impact
  - timeline_impact: how this affects the timeline
  - confidence: 0.0 to 1.0
  - is_recommended: boolean (only true for the recommended option)

Provide at least 2-3 distinct strategic options.
