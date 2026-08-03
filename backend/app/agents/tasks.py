from __future__ import annotations

from typing import Any

from app.agents import BaseAgent
from app.models.extensions import (
    Decision,
    DecisionOption,
    Department,
    Milestone,
    Plan,
    Risk,
    Role,
)
from app.repositories.extensions_repository import (
    DecisionOptionRepository,
    DecisionRepository,
    DepartmentRepository,
    MilestoneRepository,
    ObjectiveCompilationRepository,
    PlanRepository,
    RiskRepository,
    RoleRepository,
)
from app.repositories.objective_repository import ObjectiveRepository
from app.schemas.llm_outputs import (
    DashboardOutputSchema,
    DecisionOutputSchema,
    OrganizationOutputSchema,
    PlanOutputSchema,
    RiskOutputSchema,
)
from app.services.memory_retrieval import get_memory_context_for_planning


class PlannerAgent(BaseAgent):
    async def run(self, objective_id: str) -> dict[str, Any]:
        obj_repo = ObjectiveRepository(self._session)
        comp_repo = ObjectiveCompilationRepository(self._session)
        plan_repo = PlanRepository(self._session)

        objective = await obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        compilation = await comp_repo.get_by_objective(objective_id)

        # Retrieve organizational memory context
        memory_context = await get_memory_context_for_planning(
            self._session,
            objective.raw_input,
            objective_id,
            record_events=True,
        )

        context = {
            "objective": {"raw": objective.raw_input},
            "compilation": {
                "mission": compilation.mission if compilation else None,
                "vision": compilation.vision if compilation else None,
                "budget": compilation.budget if compilation else None,
                "timeline": compilation.timeline if compilation else None,
            },
            "constraints": objective.constraints,
            "memory_context": {
                "has_memories": len(memory_context.similar_objectives) > 0,
                "similar_objectives": memory_context.similar_objectives,
                "strategies": memory_context.strategies,
                "lessons_learned": memory_context.lessons_learned,
                "risks": memory_context.risks,
                "executive_decisions": memory_context.executive_decisions,
                "success_factors": memory_context.success_factors,
                "memory_sources": memory_context.memory_sources,
            },
        }

        result = await self._llm.run(
            task_type="plan",
            prompt_template="planner_v1.md",
            context=context,
            schema=PlanOutputSchema,
        )

        plan = Plan(
            objective_id=objective_id,
            name=f"Plan for {objective.raw_input[:50]}...",
            description=result.get("roadmap", {}).get("description"),
            status="draft",
            plan_version=1,
            roadmap=result.get("roadmap"),
            timeline=result.get("timeline"),
            total_cost=result.get("total_cost"),
            confidence=result.get("confidence"),
        )
        plan = await plan_repo.create(plan)

        milestones_data = result.get("milestones", [])
        milestone_repo = MilestoneRepository(self._session)
        for i, ms in enumerate(milestones_data):
            milestone = Milestone(
                plan_id=plan.id,
                name=ms.get("name", f"Milestone {i + 1}"),
                description=ms.get("description"),
                status=ms.get("status", "pending"),
                order=ms.get("order", i + 1),
                dependencies=ms.get("dependencies"),
                kpis=ms.get("kpis"),
            )
            await milestone_repo.create(milestone)

        # Store memory references in plan metadata for reporting
        memory_refs = result.get("memory_references", [])
        if memory_refs:
            await plan_repo.update(plan.id, {
                "metadata": {
                    "memory_references": memory_refs,
                    "memory_context_used": {
                        "similar_objectives_count": len(memory_context.similar_objectives),
                        "strategies_reused": len(memory_context.strategies),
                        "lessons_applied": len(memory_context.lessons_learned),
                        "risks_mitigated": len(memory_context.risks),
                    },
                }
            })

            # Record reuse events for the knowledge timeline (best-effort)
            from app.services.memory_service import MemoryService
            memory_service = MemoryService(self._session)
            for ref in memory_refs:
                memory_id = ref.get("memory_id") if isinstance(ref, dict) else None
                if memory_id:
                    await memory_service.record_event(
                        memory_id,
                        "reused",
                        {
                            "actor": "planner",
                            "objective_id": objective_id,
                            "strategy_reused": ref.get("strategy_reused") if isinstance(ref, dict) else None,
                            "lessons_applied": ref.get("lessons_applied") if isinstance(ref, dict) else None,
                        },
                    )

        await self._save_explanation(
            entity_type="Plan",
            entity_id=plan.id,
            recommendation=f"Created execution plan with {len(milestones_data)} milestones",
            reasoning=(
                "Plan generated from objective compilation data "
                "using AIKernel with organizational memory context"
            ),
            evidence=[str(context)],
            confidence=plan.confidence,
        )

        return {
            "plan_id": plan.id,
            "milestones_count": len(milestones_data),
            "status": "created",
            "memory_references": memory_refs,
            "memory_sources_count": len(memory_context.memory_sources),
        }


class RiskAgent(BaseAgent):
    async def run(self, objective_id: str) -> dict[str, Any]:
        comp_repo = ObjectiveCompilationRepository(self._session)
        risk_repo = RiskRepository(self._session)

        objective = await ObjectiveRepository(self._session).get(objective_id)

        compilation = await comp_repo.get_by_objective(objective_id)
        context = {
            "objective": {"raw": objective.raw_input if objective else ""},
            "constraints": objective.constraints if objective else {},
            "compilation": {
                "risks": compilation.risks if compilation else [],
            },
        }

        result = await self._llm.run(
            task_type="risk",
            prompt_template="risk_v1.md",
            context=context,
            schema=RiskOutputSchema,
        )

        risks_data = result.get("risks", [])
        created_risks = []

        for r_data in risks_data:
            mitigation = r_data.get("mitigation")
            contingency = r_data.get("contingency")
            if isinstance(mitigation, list):
                mitigation = " | ".join(str(m) for m in mitigation)
            if isinstance(contingency, list):
                contingency = " | ".join(str(c) for c in contingency)
            risk = Risk(
                objective_id=objective_id,
                title=r_data.get("title", "Unknown Risk"),
                description=r_data.get("description"),
                category=r_data.get("category", "strategic"),
                probability=r_data.get("probability", 0.5),
                impact=r_data.get("impact", 0.5),
                risk_level=r_data.get("risk_level", "medium"),
                risk_score=r_data.get(
                    "risk_score", r_data.get("probability", 0.5) * r_data.get("impact", 0.5)
                ),
                mitigation=mitigation,
                contingency=contingency,
                owner=r_data.get("owner"),
                status="identified",
            )
            risk = await risk_repo.create(risk)
            created_risks.append(risk.id)

        await self._save_explanation(
            entity_type="Risk",
            entity_id=objective_id,
            recommendation=f"Identified {len(created_risks)} risks",
            reasoning="Risks identified from objective compilation and constraints analysis via AIKernel",
            evidence=[str(r_data) for r_data in risks_data],
            risk_level="medium",
        )

        return {"risk_ids": created_risks, "count": len(created_risks)}


class OrganizationAgent(BaseAgent):
    async def run(self, objective_id: str) -> dict[str, Any]:
        obj_repo = ObjectiveRepository(self._session)
        comp_repo = ObjectiveCompilationRepository(self._session)

        objective = await obj_repo.get(objective_id)
        compilation = await comp_repo.get_by_objective(objective_id)
        context = {
            "objective": {"raw": objective.raw_input if objective else ""},
            "compilation": {
                "business_type": compilation.business_type if compilation else None,
                "industry": compilation.industry if compilation else None,
                "budget": compilation.budget if compilation else None,
            },
        }

        result = await self._llm.run(
            task_type="organization",
            prompt_template="organization_v1.md",
            context=context,
            schema=OrganizationOutputSchema,
            use_cache=False,
        )

        departments_data = result.get("departments", [])
        created_depts = []

        if not departments_data:

            from app.llm.fallback import build_organization
            prompt = self._llm.prompt_manager.render("organization_v1.md", context or {})
            fallback_result = build_organization(prompt)
            departments_data = fallback_result.get("departments", [])

        for dept_data in departments_data:
            dept = Department(
                objective_id=objective_id,
                name=dept_data.get("name", "Department"),
                description=dept_data.get("description"),
                head_count=dept_data.get("head_count", 0),
                budget=dept_data.get("budget"),
                status="active",
            )
            dept_repo = DepartmentRepository(self._session)
            dept = await dept_repo.create(dept)

            roles_data = dept_data.get("roles", [])
            role_repo = RoleRepository(self._session)
            for role_data in roles_data:
                role = Role(
                    department_id=dept.id,
                    title=role_data.get("title", "Role"),
                    description=role_data.get("description"),
                    responsibilities=role_data.get("responsibilities"),
                    required_skills=role_data.get("required_skills"),
                    hiring_order=role_data.get("hiring_order", 0),
                    status="active",
                    head_count=role_data.get("head_count", 1),
                )
                await role_repo.create(role)

            created_depts.append(dept.id)

        await self._save_explanation(
            entity_type="Organization",
            entity_id=objective_id,
            recommendation=f"Generated {len(created_depts)} departments with roles",
            reasoning="Organization structure derived from business type, industry, and budget via AIKernel",
            evidence=[str(departments_data)],
        )

        return {"department_ids": created_depts, "count": len(created_depts)}


class DecisionAgent(BaseAgent):
    async def run(self, objective_id: str) -> dict[str, Any]:
        decision_repo = DecisionRepository(self._session)
        comp_repo = ObjectiveCompilationRepository(self._session)

        objective = await ObjectiveRepository(self._session).get(objective_id)
        compilation = await comp_repo.get_by_objective(objective_id)

        context = {
            "objective": {"raw": objective.raw_input if objective else ""},
            "compilation": {
                "mission": compilation.mission if compilation else None,
                "budget": compilation.budget if compilation else None,
                "timeline": compilation.timeline if compilation else None,
            },
        }

        result = await self._llm.run(
            task_type="decision",
            prompt_template="decision_v1.md",
            context=context,
            schema=DecisionOutputSchema,
            use_cache=False,
        )

        options_data = result.get("options", [])
        if not options_data:

            from app.llm.fallback import build_decision
            prompt = self._llm.prompt_manager.render("decision_v1.md", context or {})
            fallback_result = build_decision(prompt)
            options_data = fallback_result.get("options", [])
            result["options"] = options_data
            for key in ("recommendation", "reasoning", "evidence", "confidence", "risk_level", "affected_departments"):
                if not result.get(key):
                    result[key] = fallback_result.get(key)

        decision = Decision(
            objective_id=objective_id,
            title="Strategic Execution Decision",
            description="AI-generated strategic recommendation for execution approach",
            decision_type="strategic",
            recommendation=result.get("recommendation"),
            reasoning=result.get("reasoning"),
            evidence=result.get("evidence"),
            confidence=result.get("confidence"),
            risk_level=result.get("risk_level"),
            affected_departments=result.get("affected_departments"),
            status="PENDING",
        )
        decision = await decision_repo.create(decision)

        for opt_data in options_data:
            option = DecisionOption(
                decision_id=decision.id,
                name=opt_data.get("name", "Option"),
                description=opt_data.get("description"),
                pros=opt_data.get("pros"),
                cons=opt_data.get("cons"),
                risks=opt_data.get("risks"),
                cost=opt_data.get("cost"),
                timeline_impact=opt_data.get("timeline_impact"),
                confidence=opt_data.get("confidence"),
                is_recommended=opt_data.get("is_recommended", False),
            )
            opt_repo = DecisionOptionRepository(self._session)
            await opt_repo.create(option)

        await self._save_explanation(
            entity_type="Decision",
            entity_id=decision.id,
            recommendation=result.get("recommendation", ""),
            reasoning=result.get("reasoning", ""),
            evidence=result.get("evidence"),
            confidence=result.get("confidence"),
            risk_level=result.get("risk_level"),
            affected_departments=result.get("affected_departments"),
        )

        return {"decision_id": decision.id, "status": decision.status}


class DashboardAgent(BaseAgent):
    async def run(self, objective_id: str) -> dict[str, Any]:
        plan_repo = PlanRepository(self._session)
        risk_repo = RiskRepository(self._session)
        decision_repo = DecisionRepository(self._session)
        obj_repo = ObjectiveRepository(self._session)
        milestone_repo = MilestoneRepository(self._session)

        objective = await obj_repo.get(objective_id)
        plans = await plan_repo.list_by_objective(objective_id)
        risks = await risk_repo.list_by_objective(objective_id)
        _decisions = await decision_repo.list_by_objective(objective_id)
        pending_decisions = await decision_repo.list_pending()

        active_plan = None
        milestones = []
        for p in plans:
            if p.status in ("active", "draft"):
                active_plan = p
                milestones = await milestone_repo.list_by_plan(p.id)
                break

        decision_counts = await decision_repo.count_by_status()
        risk_counts = await risk_repo.count_by_risk_level(objective_id)

        context = {
            "objective": {"status": objective.status if objective else None},
            "plan": {"status": active_plan.status if active_plan else None},
            "milestones_count": len(milestones),
            "risks_count": len(risks),
            "pending_decisions": len(pending_decisions),
        }

        summary = await self._llm.run(
            task_type="dashboard",
            prompt_template="dashboard_v1.md",
            context=context,
            schema=DashboardOutputSchema,
        )

        await self._save_explanation(
            entity_type="Dashboard",
            entity_id=objective_id,
            recommendation=summary.recommendation or summary.summary or "",
            reasoning=summary.reasoning or "",
            confidence=summary.confidence,
            risk_level=summary.risk_level or "medium",
        )

        return {
            "summary": summary,
            "objective": objective,
            "plan": active_plan,
            "milestones": milestones,
            "risks": len(risks),
            "risk_counts": risk_counts,
            "decision_counts": decision_counts,
            "pending_decisions": len(pending_decisions),
        }
