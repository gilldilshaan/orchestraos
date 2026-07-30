from __future__ import annotations

import json
from typing import Any

from app.config import settings
from app.llm import fallback as fallback_generator


class LLMClient:
    """Lightweight LLM abstraction. Uses configured provider or falls back to
    rule-based generation when no API keys are set (dev mode)."""

    def __init__(self) -> None:
        self._provider = self._detect_provider()

    def _detect_provider(self) -> str:
        if settings.openrouter_api_key:
            return "openrouter"
        if settings.groq_api_key:
            return "groq"
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

    @property
    def default_model(self) -> str | None:
        return {
            "openrouter": "openai/gpt-4o-mini",
            "groq": "llama-3.3-70b-versatile",
            "openai": "gpt-4o",
            "anthropic": "claude-haiku-4-5-20251001",
        }.get(self._provider)

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        response_format: type | None = None,
        temperature: float = 0.7,
        task_type: str | None = None,
        model: str | None = None,
    ) -> str:
        if not self.available:
            return self._fallback_generate(prompt, system_prompt, task_type=task_type)
        return await self._call_provider(prompt, system_prompt, temperature, model=model)

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: str | None = None,
        response_format: type = dict,
        temperature: float = 0.3,
        task_type: str | None = None,
    ) -> dict[str, Any]:
        raw = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            task_type=task_type,
        )
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return {"raw": raw}

    def _fallback_generate(
        self, prompt: str, system_prompt: str | None = None, task_type: str | None = None
    ) -> str:
        """Rule-based fallback for development without API keys.
        Returns structured data that mirrors what an LLM would produce,
        tailored to the objective's actual content via app.llm.fallback."""
        result = fallback_generator.generate(prompt, task_type=task_type)
        if result:
            return result

        prompt_lower = prompt.lower()

        if "simul" in prompt_lower or "what if" in prompt_lower or "scenario" in prompt_lower:
            return json.dumps(
                {
                    "results": {
                        "new_timeline": {"total_months": 9, "phases": 3},
                        "new_cost": 350000,
                        "new_risks": [
                            {"title": "Reduced timeline risk", "probability": 0.5, "impact": 0.6}
                        ],
                        "recommended_strategy": "Focus on core features only, defer non-essential items",
                    },
                    "comparison": {
                        "timeline_change": "-25%",
                        "cost_change": "-30%",
                        "risk_change": "Increased execution risk but reduced financial risk",
                    },
                }
            )

        if "readiness" in prompt_lower or "business readiness" in prompt_lower:
            return json.dumps(
                {
                    "overall_score": 72,
                    "market_readiness": 78,
                    "technical_feasibility": 65,
                    "budget_readiness": 60,
                    "team_readiness": 70,
                    "timeline_feasibility": 75,
                    "strengths": [
                        "Strong market demand",
                        "Clear value proposition",
                        "Experienced leadership",
                    ],
                    "weaknesses": [
                        "Limited initial budget",
                        "Gap in technical expertise",
                        "Aggressive timeline",
                    ],
                    "recommendations": [
                        "Secure additional funding before scaling",
                        "Hire senior technical lead first",
                        "Phase the roadmap to reduce timeline pressure",
                    ],
                    "category_scores": {
                        "market_opportunity": 82,
                        "competitive_landscape": 74,
                        "regulatory": 70,
                        "tech_stack": 65,
                        "infrastructure": 60,
                        "funding": 58,
                        "cash_flow": 62,
                        "team_experience": 72,
                        "team_size": 68,
                        "hiring_pipeline": 65,
                        "schedule_feasibility": 75,
                        "milestone_plan": 78,
                    },
                }
            )

        if (
            "missing info" in prompt_lower
            or "missing information" in prompt_lower
            or "clarification" in prompt_lower
        ):
            missing = []
            critical = []
            questions = []

            if not any(w in prompt_lower for w in ["budget", "cost", "funding", "dollar", "$"]):
                missing.append("budget")
                critical.append("budget")
                questions.append("What is the total budget available for this initiative?")
            if not any(w in prompt_lower for w in ["timeline", "month", "quarter", "q1", "q2", "q3", "q4", "year", "week", "day"]):
                missing.append("timeline")
                critical.append("timeline")
                questions.append("What is the expected timeline for completion?")
            if not any(w in prompt_lower for w in ["audience", "customer", "user", "b2b", "b2c", "client", "market"]):
                missing.append("target_audience")
                questions.append("Who is the target audience or customer segment?")
            if not any(w in prompt_lower for w in ["team", "engineer", "developer", "staff", "people", "headcount"]):
                missing.append("team_size")
                questions.append("What is the team size and composition?")
            if not any(w in prompt_lower for w in ["business model", "subscription", "saas", "revenue", "freemium", "license"]):
                missing.append("business_model")
                critical.append("business_model")
                questions.append("What is the business model for this platform?")
            if not any(w in prompt_lower for w in ["revenue", "subscription", "pricing", "price", "paid", "monthly", "annual"]):
                missing.append("revenue_model")
                questions.append("How will the platform generate revenue?")
            if not any(w in prompt_lower for w in ["market", "competitor", "industry", "sector", "b2b", "b2c"]):
                missing.append("market")
                questions.append("What is the target market and competitive landscape?")
            if not any(w in prompt_lower for w in ["constraint", "integration", "compliance", "requirement", "soc2", "gdpr", "limit"]):
                missing.append("constraints")
                questions.append("What are the key constraints and requirements?")
            if not any(w in prompt_lower for w in ["metric", "kpi", "success", "users", "uptime", "revenue"]):
                missing.append("success_metrics")
                critical.append("success_metrics")
                questions.append("How will success be measured?")

            return json.dumps({
                "missing_fields": missing,
                "critical_missing": critical,
                "clarification_questions": questions,
                "is_complete": len(critical) == 0,
                "reasoning": "Analyzed user input for all required fields.",
                "confidence": 0.85 if len(critical) == 0 else 0.6,
                "risk_level": "low" if len(critical) == 0 else "medium",
            })

        if "success probability" in prompt_lower or "success_probability" in prompt_lower:
            return json.dumps(
                {
                    "success_probability": 0.68,
                    "failure_risk": 0.22,
                    "delay_risk": 0.45,
                    "budget_overrun_risk": 0.35,
                    "team_risk": 0.30,
                    "confidence_score": 0.75,
                    "reasoning": "The objective has moderate success probability. Market demand is strong but budget constraints and timeline pressures introduce significant risk. The team has relevant experience but may need additional hires to cover skill gaps.",
                    "risk_factors": [
                        {
                            "factor": "Limited budget",
                            "impact": "May force scope reduction",
                            "mitigation": "Phase deliverables",
                        },
                        {
                            "factor": "Aggressive timeline",
                            "impact": "Quality risk",
                            "mitigation": "Prioritize MVP features",
                        },
                    ],
                    "mitigating_factors": [
                        {
                            "factor": "Strong market demand",
                            "impact": "Faster adoption",
                            "value": "High",
                        },
                        {
                            "factor": "Experienced leadership",
                            "impact": "Better decision making",
                            "value": "Medium",
                        },
                    ],
                }
            )

        if "resource gap" in prompt_lower or "resource_gap" in prompt_lower:
            return json.dumps(
                {
                    "missing_roles": [
                        {
                            "title": "Senior Backend Engineer",
                            "department": "Engineering",
                            "count": 2,
                            "urgency": "high",
                        },
                        {
                            "title": "DevOps Engineer",
                            "department": "Engineering",
                            "count": 1,
                            "urgency": "medium",
                        },
                        {
                            "title": "QA Lead",
                            "department": "Engineering",
                            "count": 1,
                            "urgency": "high",
                        },
                    ],
                    "missing_skills": [
                        "Kubernetes",
                        "CI/CD",
                        "Performance Testing",
                        "System Architecture",
                    ],
                    "hiring_needs": [
                        {
                            "role_title": "Senior Backend Engineer",
                            "count": 2,
                            "estimated_salary": 180000,
                            "timeline_weeks": 8,
                        },
                        {
                            "role_title": "DevOps Engineer",
                            "count": 1,
                            "estimated_salary": 150000,
                            "timeline_weeks": 6,
                        },
                        {
                            "role_title": "QA Lead",
                            "count": 1,
                            "estimated_salary": 130000,
                            "timeline_weeks": 4,
                        },
                    ],
                    "estimated_cost": 640000,
                    "estimated_hiring_timeline": "8-12 weeks for full team",
                    "hiring_priority": [
                        {
                            "role": "Senior Backend Engineer",
                            "priority": 1,
                            "reason": "Critical path dependency",
                        },
                        {
                            "role": "QA Lead",
                            "priority": 2,
                            "reason": "Quality assurance needed before launch",
                        },
                        {
                            "role": "DevOps Engineer",
                            "priority": 3,
                            "reason": "Infrastructure setup",
                        },
                    ],
                    "available_resources": {"total_head_count": 8, "total_budget": 500000},
                    "required_resources": {"total_head_count": 14, "total_budget": 1140000},
                }
            )

        if "bottleneck" in prompt_lower:
            return json.dumps(
                {
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
                }
            )

        if "enriched context" in prompt_lower and "explanation" in prompt_lower:
            return json.dumps(
                {
                    "recommendation": "Proceed with phased approach starting with MVP",
                    "reasoning": "Phased approach reduces risk while allowing rapid iteration",
                    "evidence": ["Market analysis", "Team capacity assessment", "Budget analysis"],
                    "assumptions": ["Stable market conditions", "Team can scale as needed"],
                    "confidence": 0.78,
                    "trade_offs": ["Speed vs quality", "Scope vs timeline"],
                    "risks": [{"risk": "Market shift", "likelihood": 0.3, "impact": 0.7}],
                    "dependencies": ["Hiring completion", "Budget approval"],
                    "affected_modules": ["Planner", "Organization Generator", "Risk Engine"],
                }
            )

        return ""

    async def _call_provider(
        self, prompt: str, system_prompt: str | None, temperature: float, model: str | None = None
    ) -> str:
        from openai import AsyncOpenAI

        if self._provider == "openrouter":
            client = AsyncOpenAI(
                api_key=settings.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
            )
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            response = await client.chat.completions.create(
                model=model or "openai/gpt-4o-mini",
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content or ""

        if self._provider == "groq":
            client = AsyncOpenAI(
                api_key=settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
            )
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            response = await client.chat.completions.create(
                model=model or "llama-3.3-70b-versatile",
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content or ""

        if self._provider == "openai":
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            response = await client.chat.completions.create(
                model=model or "gpt-4o",
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content or ""

        if self._provider == "anthropic":
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=settings.anthropic_api_key)
            kwargs = {}
            if system_prompt:
                kwargs["system"] = [{"type": "text", "text": system_prompt}]
            response = await client.messages.create(
                model=model or "claude-haiku-4-5-20251001",
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                **kwargs,
            )
            return response.content[0].text if response.content else ""

        raise NotImplementedError(f"Provider {self._provider} not yet implemented")


llm_client = LLMClient()
