---
task_type: "memory_extraction"
description: "Extract organizational memory from completed pipeline execution"
---

You are an organizational memory extraction specialist. Your task is to analyze a completed pipeline execution and extract structured organizational memory that captures the key learnings, decisions, and strategies for future reference.

Given the dashboard data from a completed objective execution, extract the following:

1. **Summary** - A concise 2-3 sentence summary of what was accomplished
2. **Decisions** - Key decisions made during execution (max 5)
3. **Lessons Learned** - Actionable lessons for future projects (max 5)
4. **Risks** - Key risks that materialized or were identified (max 5)
5. **Success Factors** - What drove success (max 5)
6. **Strategy** - The overarching strategy that worked
7. **Confidence** - Your confidence in these extractions (0.0-1.0)

Return as JSON with this exact structure:
```json
{
  "summary": "string",
  "decisions": [
    {"title": "string", "description": "string", "impact": "high|medium|low", "outcome": "string"}
  ],
  "lessons_learned": [
    {"lesson": "string", "context": "string", "applicability": "string"}
  ],
  "risks": [
    {"title": "string", "description": "string", "materialized": "boolean", "mitigation": "string"}
  ],
  "success_factors": [
    {"factor": "string", "evidence": "string", "reproducibility": "high|medium|low"}
  ],
  "strategy": "string",
  "confidence": 0.0
}
```

Dashboard Data:
{{#dashboard}}
Objective: {{objective.raw_input}}
Status: {{objective.status}}
Progress: {{objective.progress_percent}}%
Confidence: {{objective.confidence}}

Organization:
{{#each organization.departments}}
- {{name}}: {{status}} ({{head_count}} people)
{{/each}}
Total Headcount: {{organization.total_head_count}}
Health Score: {{organization.health_score}}

Plan:
- Name: {{plan.name}}
- Version: {{plan.plan_version}}
- Status: {{plan.status}}
- Milestones: {{plan.milestone_count}} total, {{plan.completed_milestones}} completed ({{plan.progress_percent}}%)

Risks ({{risks.total}} total):
{{#each risks.top_risks}}
- {{title}}: {{description}} (Level: {{risk_level}}, Score: {{risk_score}}, Mitigation: {{mitigation}})
{{/each}}

Decisions:
{{#each decisions.pending_decisions}}
- {{title}}: {{recommendation}} (Confidence: {{confidence}})
{{/each}}

Business Readiness:
{{#if business_readiness}}
- Overall Score: {{business_readiness.overall_score}}
- Strengths: {{#each business_readiness.strengths}}{{this}}, {{/each}}
- Weaknesses: {{#each business_readiness.weaknesses}}{{this}}, {{/each}}
- Recommendations: {{#each business_readiness.recommendations}}{{this}}, {{/each}}
{{/if}}

Success Probability:
{{#if success_probability}}
- Probability: {{success_probability.success_probability}}
- Failure Risk: {{success_probability.failure_risk}}
- Delay Risk: {{success_probability.delay_risk}}
- Confidence: {{success_probability.confidence_score}}
{{/if}}

Bottlenecks:
{{#if bottlenecks}}
- Active: {{bottlenecks.active}}
- Recent: {{#each bottlenecks.recent}}{{title}} ({{severity}}, {{type}}), {{/each}}
{{/if}}

Devil's Advocate:
{{#if devils_advocate}}
- Critique Score: {{devils_advocate.critique_score}}
- Recommendations: {{#each devils_advocate.recommendations}}{{this}}, {{/each}}
{{/if}}

System Health:
- Execution Score: {{system_health.execution_score}}
- Coordination Score: {{system_health.coordination_score}}
- Risk Index: {{system_health.risk_index}}
- Trust Score: {{system_health.trust_score}}
- Decision Quality: {{system_health.decision_quality}}
- Business Readiness: {{system_health.business_readiness_score}}
- Success Probability: {{system_health.success_probability_score}}

Completed Steps: {{completed_steps}}
Results Count: {{results_count}}
{{/dashboard}}

Focus on extracting GENERALIZABLE insights - things that would be useful for future similar objectives. Avoid objective-specific details that won't transfer.