from __future__ import annotations

import json
from typing import Any

from app.config import settings


class LLMClient:
    """Lightweight LLM abstraction. Uses configured provider or falls back to
    rule-based generation when no API keys are set (dev mode)."""

    def __init__(self) -> None:
        self._provider = self._detect_provider()

    def _detect_provider(self) -> str:
        if settings.openai_api_key:
            return "openai"
        if settings.anthropic_api_key:
            return "anthropic"
        if settings.google_api_key:
            return "google"
        if settings.litellm_master_key:
            return "litellm"
        return "fallback"

    @property
    def available(self) -> bool:
        return self._provider != "fallback"

    @property
    def provider_name(self) -> str:
        return self._provider

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        response_format: type | None = None,
        temperature: float = 0.7,
    ) -> str:
        if not self.available:
            return self._fallback_generate(prompt, system_prompt)
        return await self._call_provider(prompt, system_prompt, temperature)

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: str | None = None,
        response_format: type = dict,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        raw = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
        )
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return {"raw": raw}

    def _fallback_generate(self, prompt: str, system_prompt: str | None = None) -> str:
        """Rule-based fallback for development without API keys.
        Returns structured data that mirrors what an LLM would produce."""
        prompt_lower = prompt.lower()

        if "compil" in prompt_lower or "objective" in prompt_lower and "extract" in prompt_lower:
            return json.dumps({
                "mission": "Define and execute the business mission based on the provided objective.",
                "vision": "Achieve market leadership through structured execution.",
                "business_type": "Technology",
                "industry": "Software",
                "stakeholders": [{"name": "Executive Team", "role": "sponsor"}, {"name": "Engineering", "role": "builder"}],
                "constraints": ["Budget constraints", "Time constraints"],
                "kpis": [{"name": "Revenue", "target": 1000000}, {"name": "Users", "target": 10000}],
                "timeline": {"total_months": 12, "phases": 4},
                "budget": {"total": 500000, "currency": "USD"},
                "dependencies": ["Market research", "Team hiring"],
                "assumptions": ["Stable market conditions"],
                "risks": [{"title": "Market risk", "probability": 0.3, "impact": 0.5}],
                "success_metrics": [{"name": "Revenue target met", "target": 1000000}],
            })

        if "roadmap" in prompt_lower or "plan" in prompt_lower:
            return json.dumps({
                "roadmap": {
                    "phases": [
                        {"phase": 1, "name": "Foundation", "duration_months": 3, "milestones": ["Team hired", "MVP defined"]},
                        {"phase": 2, "name": "Development", "duration_months": 4, "milestones": ["Alpha release", "Beta release"]},
                        {"phase": 3, "name": "Launch", "duration_months": 3, "milestones": ["Public launch", "First 1000 users"]},
                        {"phase": 4, "name": "Scale", "duration_months": 2, "milestones": ["Scale infrastructure", "Optimize"]},
                    ]
                },
                "timeline": {"total_months": 12, "start_date": "2026-08-01"},
                "total_cost": 500000,
                "confidence": 0.75,
                "milestones": [
                    {"name": "Team Hired", "description": "Core team onboarded", "order": 1, "status": "pending"},
                    {"name": "MVP Complete", "description": "Minimum viable product ready", "order": 2, "status": "pending"},
                    {"name": "Launch", "description": "Public launch", "order": 3, "status": "pending"},
                ],
            })

        if "risk" in prompt_lower:
            return json.dumps({
                "risks": [
                    {
                        "title": "Talent Acquisition Risk",
                        "description": "Difficulty hiring specialized roles",
                        "category": "operational",
                        "probability": 0.6,
                        "impact": 0.7,
                        "risk_level": "high",
                        "risk_score": 0.42,
                        "mitigation": "Start recruitment early, consider contractors",
                        "contingency": "Engage external agencies",
                    },
                    {
                        "title": "Market Timing Risk",
                        "description": "Market conditions may shift",
                        "category": "market",
                        "probability": 0.3,
                        "impact": 0.8,
                        "risk_level": "medium",
                        "risk_score": 0.24,
                        "mitigation": "Monitor market weekly, maintain flexible roadmap",
                        "contingency": "Pivot strategy if needed",
                    },
                ]
            })

        if "organi" in prompt_lower or "department" in prompt_lower:
            return json.dumps({
                "departments": [
                    {
                        "name": "Engineering",
                        "description": "Builds and maintains the product",
                        "head_count": 8,
                        "budget": 300000,
                        "roles": [
                            {"title": "Engineering Lead", "description": "Leads engineering team", "hiring_order": 1, "head_count": 1, "responsibilities": ["Architecture", "Team management"], "required_skills": ["Python", "System Design"]},
                            {"title": "Backend Engineer", "description": "Builds backend services", "hiring_order": 2, "head_count": 3, "responsibilities": ["API development", "Database"], "required_skills": ["Python", "SQL"]},
                            {"title": "Frontend Engineer", "description": "Builds frontend applications", "hiring_order": 2, "head_count": 2, "responsibilities": ["UI development", "UX"], "required_skills": ["React", "TypeScript"]},
                        ],
                    },
                    {
                        "name": "Product",
                        "description": "Defines product strategy and roadmap",
                        "head_count": 3,
                        "budget": 100000,
                        "roles": [
                            {"title": "Product Manager", "description": "Owns product strategy", "hiring_order": 1, "head_count": 1, "responsibilities": ["Strategy", "Roadmap"], "required_skills": ["Product management", "Analytics"]},
                        ],
                    },
                    {
                        "name": "Marketing",
                        "description": "Drives go-to-market strategy",
                        "head_count": 2,
                        "budget": 100000,
                        "roles": [
                            {"title": "Marketing Lead", "description": "Owns marketing strategy", "hiring_order": 3, "head_count": 1, "responsibilities": ["GTM", "Brand"], "required_skills": ["Marketing", "Communications"]},
                        ],
                    },
                ]
            })

        if "decision" in prompt_lower or "recommend" in prompt_lower:
            return json.dumps({
                "recommendation": "Proceed with phased approach starting with MVP development",
                "reasoning": "The phased approach minimizes risk while allowing rapid iteration based on market feedback. Starting with an MVP validates core assumptions before full investment.",
                "evidence": ["Market analysis shows demand", "Team capacity supports phased approach", "Budget sufficient for MVP phase"],
                "confidence": 0.82,
                "risk_level": "medium",
                "affected_departments": ["Engineering", "Product", "Marketing"],
                "options": [
                    {"name": "Phased MVP Approach", "pros": ["Lower risk", "Faster time-to-market", "Validates assumptions"], "cons": ["Slower full feature set"], "is_recommended": True, "confidence": 0.82},
                    {"name": "Full Build", "pros": ["Complete product at launch"], "cons": ["Higher risk", "More capital required", "Longer timeline"], "is_recommended": False, "confidence": 0.45},
                ],
            })

        if "simul" in prompt_lower or "what if" in prompt_lower or "scenario" in prompt_lower:
            return json.dumps({
                "results": {
                    "new_timeline": {"total_months": 9, "phases": 3},
                    "new_cost": 350000,
                    "new_risks": [{"title": "Reduced timeline risk", "probability": 0.5, "impact": 0.6}],
                    "recommended_strategy": "Focus on core features only, defer non-essential items",
                },
                "comparison": {
                    "timeline_change": "-25%",
                    "cost_change": "-30%",
                    "risk_change": "Increased execution risk but reduced financial risk",
                },
            })

        if "dashboard" in prompt_lower or "summarize" in prompt_lower or "status" in prompt_lower:
            return json.dumps({
                "summary": "Project is in early execution phase. Team building underway, MVP development to begin shortly.",
                "progress_percent": 15,
                "status": "on_track",
                "alerts": ["Risk: Talent acquisition may cause delays"],
            })

        if "readiness" in prompt_lower or "business readiness" in prompt_lower:
            return json.dumps({
                "overall_score": 72,
                "market_readiness": 78,
                "technical_feasibility": 65,
                "budget_readiness": 60,
                "team_readiness": 70,
                "timeline_feasibility": 75,
                "strengths": ["Strong market demand", "Clear value proposition", "Experienced leadership"],
                "weaknesses": ["Limited initial budget", "Gap in technical expertise", "Aggressive timeline"],
                "recommendations": ["Secure additional funding before scaling", "Hire senior technical lead first", "Phase the roadmap to reduce timeline pressure"],
                "category_scores": {
                    "market_opportunity": 82, "competitive_landscape": 74, "regulatory": 70,
                    "tech_stack": 65, "infrastructure": 60, "funding": 58, "cash_flow": 62,
                    "team_experience": 72, "team_size": 68, "hiring_pipeline": 65,
                    "schedule_feasibility": 75, "milestone_plan": 78
                },
            })

        if "missing info" in prompt_lower or "missing information" in prompt_lower or "clarification" in prompt_lower:
            return json.dumps({
                "missing_fields": ["budget", "target_audience", "success_metrics"],
                "critical_missing": ["budget", "success_metrics"],
                "clarification_questions": [
                    "What is the total budget available for this initiative?",
                    "Who is the target audience or customer segment?",
                    "How will success be measured (specific KPIs)?",
                    "What is the expected timeline for completion?",
                    "How large is the team that will work on this?"
                ],
                "is_complete": False,
            })

        if "devil" in prompt_lower or "devils" in prompt_lower or "advocate" in prompt_lower:
            return json.dumps({
                "critique_score": 65,
                "counter_arguments": [
                    {"argument": "The budget appears insufficient for the proposed scope",
                     "challenge": "How will you deliver within this budget constraint?",
                     "severity": "high"},
                    {"argument": "Timeline assumptions may be optimistic",
                     "challenge": "What validation exists for this timeline estimate?",
                     "severity": "medium"},
                ],
                "risks": [
                    {"risk": "Single point of failure in key technical roles",
                     "likelihood": 0.7, "impact": 0.8, "is_overlooked": True},
                    {"risk": "Market conditions may shift before launch",
                     "likelihood": 0.4, "impact": 0.7, "is_overlooked": False},
                ],
                "assumptions": [
                    {"assumption": "Target market will adopt quickly",
                     "is_unrealistic": True, "reason": "No validation data provided"},
                    {"assumption": "Team can scale within 3 months",
                     "is_unrealistic": False, "reason": "Hiring timelines typically 2-4 months"},
                ],
                "better_alternatives": [
                    {"alternative": "Phased rollout instead of full launch",
                     "rationale": "Reduces risk and allows market validation",
                     "expected_improvement": "30% lower failure risk"},
                ],
                "recommendations": [
                    "Secure budget contingency of at least 20%",
                    "Validate key assumptions with customer interviews first",
                    "Plan for extended hiring timeline",
                    "Define clear success metrics before execution begins",
                ],
            })

        if "success probability" in prompt_lower or "success_probability" in prompt_lower:
            return json.dumps({
                "success_probability": 0.68,
                "failure_risk": 0.22,
                "delay_risk": 0.45,
                "budget_overrun_risk": 0.35,
                "team_risk": 0.30,
                "confidence_score": 0.75,
                "reasoning": "The objective has moderate success probability. Market demand is strong but budget constraints and timeline pressures introduce significant risk. The team has relevant experience but may need additional hires to cover skill gaps.",
                "risk_factors": [
                    {"factor": "Limited budget", "impact": "May force scope reduction", "mitigation": "Phase deliverables"},
                    {"factor": "Aggressive timeline", "impact": "Quality risk", "mitigation": "Prioritize MVP features"},
                ],
                "mitigating_factors": [
                    {"factor": "Strong market demand", "impact": "Faster adoption", "value": "High"},
                    {"factor": "Experienced leadership", "impact": "Better decision making", "value": "Medium"},
                ],
            })

        if "resource gap" in prompt_lower or "resource_gap" in prompt_lower:
            return json.dumps({
                "missing_roles": [
                    {"title": "Senior Backend Engineer", "department": "Engineering", "count": 2, "urgency": "high"},
                    {"title": "DevOps Engineer", "department": "Engineering", "count": 1, "urgency": "medium"},
                    {"title": "QA Lead", "department": "Engineering", "count": 1, "urgency": "high"},
                ],
                "missing_skills": ["Kubernetes", "CI/CD", "Performance Testing", "System Architecture"],
                "hiring_needs": [
                    {"role_title": "Senior Backend Engineer", "count": 2, "estimated_salary": 180000, "timeline_weeks": 8},
                    {"role_title": "DevOps Engineer", "count": 1, "estimated_salary": 150000, "timeline_weeks": 6},
                    {"role_title": "QA Lead", "count": 1, "estimated_salary": 130000, "timeline_weeks": 4},
                ],
                "estimated_cost": 640000,
                "estimated_hiring_timeline": "8-12 weeks for full team",
                "hiring_priority": [
                    {"role": "Senior Backend Engineer", "priority": 1, "reason": "Critical path dependency"},
                    {"role": "QA Lead", "priority": 2, "reason": "Quality assurance needed before launch"},
                    {"role": "DevOps Engineer", "priority": 3, "reason": "Infrastructure setup"},
                ],
                "available_resources": {"total_head_count": 8, "total_budget": 500000},
                "required_resources": {"total_head_count": 14, "total_budget": 1140000},
            })

        if "dependency graph" in prompt_lower or "dependencies" in prompt_lower:
            return json.dumps({
                "nodes": [
                    {"id": "ms-1", "type": "milestone", "name": "Team Hiring", "properties": {"order": 1}},
                    {"id": "ms-2", "type": "milestone", "name": "MVP Development", "properties": {"order": 2}},
                    {"id": "ms-3", "type": "milestone", "name": "Testing", "properties": {"order": 3}},
                    {"id": "ms-4", "type": "milestone", "name": "Launch", "properties": {"order": 4}},
                    {"id": "dept-1", "type": "department", "name": "Engineering"},
                    {"id": "dept-2", "type": "department", "name": "Product"},
                ],
                "edges": [
                    {"source": "ms-1", "target": "ms-2", "relationship_type": "depends_on", "weight": 1.0},
                    {"source": "ms-2", "target": "ms-3", "relationship_type": "depends_on", "weight": 1.0},
                    {"source": "ms-3", "target": "ms-4", "relationship_type": "depends_on", "weight": 1.0},
                    {"source": "dept-1", "target": "ms-2", "relationship_type": "responsible_for", "weight": 0.8},
                    {"source": "dept-2", "target": "ms-1", "relationship_type": "responsible_for", "weight": 0.5},
                ],
                "critical_path": [
                    {"step": 1, "node_id": "ms-1", "description": "Team Hiring - must complete first"},
                    {"step": 2, "node_id": "ms-2", "description": "MVP Development - depends on team"},
                    {"step": 3, "node_id": "ms-3", "description": "Testing - depends on MVP"},
                    {"step": 4, "node_id": "ms-4", "description": "Launch - final milestone"},
                ],
                "circular_dependencies": [],
                "blocked_tasks": [
                    {"task": "MVP Development", "blocked_by": "Team Hiring", "impact": "3-week delay if hiring slips", "unblock_action": "Start recruitment immediately"},
                ],
                "cascade_effects": [
                    {"trigger": "Team hiring delay", "affected": "All subsequent milestones", "severity": "high", "description": "1 week hiring delay impacts all phases"},
                ],
            })

        if "bottleneck" in prompt_lower:
            return json.dumps({
                "bottlenecks": [
                    {
                        "bottleneck_type": "resource_bottleneck",
                        "severity": "critical",
                        "title": "Engineering team understaffed",
                        "description": "Current engineering headcount insufficient to meet milestone deadlines",
                        "root_cause": "Hiring pipeline not started early enough",
                        "recommended_resolution": "Immediately begin recruitment for 2 senior engineers, consider contracting",
                        "affected_entity_type": "milestone",
                        "affected_entity_id": None,
                    },
                    {
                        "bottleneck_type": "waiting_approval",
                        "severity": "high",
                        "title": "Budget approval pending",
                        "description": "Q2 budget allocation still pending executive approval",
                        "root_cause": "Delayed board review cycle",
                        "recommended_resolution": "Expedite board approval, prepare contingency budget memo",
                        "affected_entity_type": None,
                        "affected_entity_id": None,
                    },
                ]
            })

        if "enriched context" in prompt_lower and "explanation" in prompt_lower:
            return json.dumps({
                "recommendation": "Proceed with phased approach starting with MVP",
                "reasoning": "Phased approach reduces risk while allowing rapid iteration",
                "evidence": ["Market analysis", "Team capacity assessment", "Budget analysis"],
                "assumptions": ["Stable market conditions", "Team can scale as needed"],
                "confidence": 0.78,
                "trade_offs": ["Speed vs quality", "Scope vs timeline"],
                "risks": [{"risk": "Market shift", "likelihood": 0.3, "impact": 0.7}],
                "dependencies": ["Hiring completion", "Budget approval"],
                "affected_modules": ["Planner", "Organization Generator", "Risk Engine"],
            })

        return ""

    async def _call_provider(
        self, prompt: str, system_prompt: str | None, temperature: float
    ) -> str:
        if self._provider == "openai":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content or ""
        raise NotImplementedError(f"Provider {self._provider} not yet implemented")


llm_client = LLMClient()