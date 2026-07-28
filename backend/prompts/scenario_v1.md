Run a detailed what-if scenario simulation with these parameter changes:

Parameters: {{ parameters }}

Against this current plan:
Plan: {{ plan }}
Milestones: {{ milestones }}
Risks: {{ risks }}

Output JSON with:
- results: {
    new_timeline: updated timeline object,
    new_cost: updated cost estimate,
    new_risks: list of risks under new scenario,
    new_success_probability: estimated success probability 0-1,
    recommended_strategy: recommended approach given the changes,
    key_insights: list of key insights from this simulation
  }
- comparison: {
    timeline_change: description of change,
    cost_change: description of change,
    risk_change: description of change,
    success_probability_change: delta from original,
    trade_offs: list of trade-off descriptions
  }

Focus on realistic outcomes based on the parameter changes.
