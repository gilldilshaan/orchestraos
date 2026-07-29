from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.kernel.state_machine import WorkflowStateMachine
from app.models.extensions import KnowledgeGraphEdge, PlanVersion, Scenario
from app.repositories.extensions_repository import (
    DecisionRepository,
    DepartmentRepository,
    ExplanationRepository,
    KnowledgeGraphRepository,
    MilestoneRepository,
    PlanRepository,
    PlanVersionRepository,
    RiskRepository,
    ScenarioRepository,
)
from app.repositories.features_repository import (
    BottleneckRepository,
    BusinessReadinessRepository,
    DecisionMemoryRepository,
    DependencyGraphRepository,
    DevilsAdvocateRepository,
    ResourceGapRepository,
    SuccessProbabilityRepository,
)
from app.repositories.objective_repository import ObjectiveRepository


class SimulationEngine:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._plan_repo = PlanRepository(session)
        self._scenario_repo = ScenarioRepository(session)

    async def run_simulation(
        self,
        objective_id: str,
        parameters: dict[str, Any],
        base_plan_id: str | None = None,
        name: str = "What-If Scenario",
        description: str | None = None,
    ) -> dict[str, Any]:
        scenario = Scenario(
            objective_id=objective_id,
            base_plan_id=base_plan_id,
            name=name,
            description=description,
            parameters=parameters,
            status="running",
        )
        scenario = await self._scenario_repo.create(scenario)

        plan = None
        if base_plan_id:
            plan = await self._plan_repo.get(base_plan_id)
        elif not base_plan_id:
            plans = await self._plan_repo.list_by_objective(objective_id, limit=1)
            plan = plans[0] if plans else None

        plan_snapshot = {
            "roadmap": plan.roadmap if plan else None,
            "timeline": plan.timeline if plan else None,
            "total_cost": plan.total_cost if plan else None,
            "milestones": [{"name": m.name, "order": m.order, "status": m.status} for m in (plan.milestones if plan else [])],
        } if plan else {}

        context = {
            "parameters": parameters,
            "plan_snapshot": plan_snapshot,
            "objective_id": objective_id,
        }

        result = await ai_kernel.run(
            task_type="simulation",
            prompt_template="scenario_v1.md",
            context=context,
        )

        scenario.results = result.get("results", result)
        scenario.comparison = result.get("comparison")
        scenario.status = "completed"
        await self._scenario_repo.update(scenario.id, {
            "results": result.get("results", result),
            "comparison": result.get("comparison"),
            "status": "completed",
        })

        return {
            "scenario_id": scenario.id,
            "parameters": parameters,
            "results": result.get("results", result),
            "comparison": result.get("comparison"),
        }


class AdaptiveReplanningService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._plan_repo = PlanRepository(session)
        self._plan_version_repo = PlanVersionRepository(session)
        self._obj_repo = ObjectiveRepository(session)

    async def replan(
        self,
        plan_id: str,
        changes: dict[str, Any],
    ) -> dict[str, Any]:
        plan = await self._plan_repo.get(plan_id)
        if not plan:
            return {"error": "Plan not found"}

        previous_version = plan.plan_version
        old_snapshot = {
            "roadmap": plan.roadmap,
            "timeline": plan.timeline,
            "total_cost": plan.total_cost,
            "confidence": plan.confidence,
            "status": plan.status,
        }

        context = {
            "changes": changes,
            "old_snapshot": old_snapshot,
            "plan_id": plan_id,
            "previous_version": previous_version,
        }

        result = await ai_kernel.run(
            task_type="replan",
            prompt_template="planner_v1.md",
            context=context,
        )

        new_version = previous_version + 1
        update_data = {
            "plan_version": new_version,
            "roadmap": result.get("roadmap"),
            "timeline": result.get("timeline"),
            "total_cost": result.get("total_cost"),
            "confidence": result.get("confidence"),
            "status": "active",
        }
        await self._plan_repo.update(plan_id, update_data)

        version_record = PlanVersion(
            plan_id=plan_id,
            version_number=new_version,
            changes=changes,
            diff_summary=result.get("diff_summary", "Plan adjusted"),
            snapshot={"old": old_snapshot, "new": update_data},
        )
        await self._plan_version_repo.create(version_record)

        return {
            "plan_id": plan_id,
            "previous_version": previous_version,
            "new_version": new_version,
            "changes": changes,
            "diff_summary": result.get("diff_summary", "Plan adjusted"),
            "updated_plan": update_data,
        }


class KnowledgeGraphService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._graph_repo = KnowledgeGraphRepository(session)

    async def add_edge(
        self,
        source_type: str,
        source_id: str,
        target_type: str,
        target_id: str,
        relationship_type: str,
        properties: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        edge = KnowledgeGraphEdge(
            source_type=source_type,
            source_id=source_id,
            target_type=target_type,
            target_id=target_id,
            relationship_type=relationship_type,
            properties=properties,
        )
        edge = await self._graph_repo.create(edge)
        return {"edge_id": edge.id}

    async def get_connected(
        self, entity_type: str, entity_id: str
    ) -> dict[str, Any]:
        edges = await self._graph_repo.find_connected(entity_type, entity_id)
        nodes = set()
        edge_list = []
        for e in edges:
            edge_list.append({
                "id": e.id,
                "source_type": e.source_type,
                "source_id": e.source_id,
                "target_type": e.target_type,
                "target_id": e.target_id,
                "relationship_type": e.relationship_type,
            })
            nodes.add((e.source_type, e.source_id))
            nodes.add((e.target_type, e.target_id))

        return {
            "nodes": [{"type": nt, "id": ni} for nt, ni in nodes],
            "edges": edge_list,
        }

    async def auto_link_objective(self, objective_id: str) -> dict[str, Any]:
        """Automatically create graph edges for all entities linked to an objective."""
        from app.repositories.extensions_repository import (
            DecisionRepository,
            DepartmentRepository,
            PlanRepository,
            RiskRepository,
        )

        links = []

        plans = await PlanRepository(self._session).list_by_objective(objective_id)
        for p in plans:
            edge = await self.add_edge("Objective", objective_id, "Plan", p.id, "HAS_PLAN")
            links.append(edge)
            for ms in p.milestones:
                me = await self.add_edge("Plan", p.id, "Milestone", ms.id, "HAS_MILESTONE")
                links.append(me)

        depts = await DepartmentRepository(self._session).list_by_objective(objective_id)
        for d in depts:
            edge = await self.add_edge("Objective", objective_id, "Department", d.id, "HAS_DEPARTMENT")
            links.append(edge)

        risks = await RiskRepository(self._session).list_by_objective(objective_id)
        for r in risks:
            edge = await self.add_edge("Objective", objective_id, "Risk", r.id, "HAS_RISK")
            links.append(edge)

        decisions = await DecisionRepository(self._session).list_by_objective(objective_id)
        for d in decisions:
            edge = await self.add_edge("Objective", objective_id, "Decision", d.id, "HAS_DECISION")
            links.append(edge)

        return {"links_created": len(links)}


class DashboardAggregator:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._obj_repo = ObjectiveRepository(session)
        self._plan_repo = PlanRepository(session)
        self._risk_repo = RiskRepository(session)
        self._decision_repo = DecisionRepository(session)
        self._milestone_repo = MilestoneRepository(session)
        self._dept_repo = DepartmentRepository(session)

    async def get_dashboard(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        plans = await self._plan_repo.list_by_objective(objective_id)
        risks = await self._risk_repo.list_by_objective(objective_id)
        decisions = await self._decision_repo.list_by_objective(objective_id)
        depts = await self._dept_repo.list_by_objective(objective_id)
        decision_counts = await self._decision_repo.count_by_status()
        risk_counts = await self._risk_repo.count_by_risk_level(objective_id)
        pending_decisions = await self._decision_repo.list_pending()

        active_plan = None
        milestones = []
        completed_ms = 0
        if plans:
            active_plan = plans[0]
            if active_plan:
                milestones = await self._milestone_repo.list_by_plan(active_plan.id)
                completed_ms = sum(1 for m in milestones if m.status == "completed")

        total_head_count = sum(d.head_count or 0 for d in depts)
        total_budget = sum(d.budget or 0 for d in depts) if depts else None
        decision_risk = len([d for d in decisions if d.status == "PENDING"])

        # New feature data integrations
        readiness_repo = BusinessReadinessRepository(self._session)
        readiness = await readiness_repo.get_by_objective(objective_id)

        prob_repo = SuccessProbabilityRepository(self._session)
        probability = await prob_repo.get_by_objective(objective_id)

        bottleneck_repo = BottleneckRepository(self._session)
        bottleneck_counts = await bottleneck_repo.count_by_severity(objective_id)
        bottlenecks = await bottleneck_repo.list_by_objective(objective_id, limit=5)

        da_repo = DevilsAdvocateRepository(self._session)
        da = await da_repo.get_latest_by_objective(objective_id)

        mem_repo = DecisionMemoryRepository(self._session)
        memory_entries = await mem_repo.list_by_objective(objective_id, limit=5)

        return {
            "objective": {
                "id": objective.id if objective else None,
                "summary": objective.raw_input[:200] if objective else None,
                "status": objective.status if objective else None,
                "current_stage": objective.current_stage if objective else None,
                "confidence": objective.confidence if objective else None,
                "created_at": objective.created_at.isoformat() if objective else None,
                "updated_at": objective.updated_at.isoformat() if objective else None,
                "progress_percent": (
                    WorkflowStateMachine.get_progress_percent(objective.status) if objective else 0
                ),
            },
            "organization": {
                "departments": [
                    {"name": d.name, "status": d.status, "role_count": len(d.roles) if d.roles else 0, "head_count": d.head_count or 0}
                    for d in depts
                ],
                "total_head_count": total_head_count,
                "health_score": 0.85 if depts else None,
            },
            "plan": {
                "id": active_plan.id if active_plan else None,
                "name": active_plan.name if active_plan else None,
                "status": active_plan.status if active_plan else None,
                "plan_version": active_plan.plan_version if active_plan else 0,
                "milestone_count": len(milestones),
                "completed_milestones": completed_ms,
                "progress_percent": (completed_ms / len(milestones) * 100) if milestones else 0,
            },
            "risks": {
                "total": len(risks),
                **risk_counts,
                "top_risks": [
                    {"id": r.id, "title": r.title, "risk_level": r.risk_level, "probability": r.probability, "impact": r.impact}
                    for r in risks[:5]
                ],
            },
            "decisions": {
                **decision_counts,
                "pending_decisions": [
                    {"id": d.id, "title": d.title, "recommendation": d.recommendation, "confidence": d.confidence}
                    for d in pending_decisions[:10]
                ],
            },
            "jobs": {"active": 0, "pending": 0, "completed": 0, "failed": 0},
            "business_readiness": {
                "overall_score": readiness.overall_score if readiness else None,
                "strengths": readiness.strengths if readiness else [],
                "weaknesses": readiness.weaknesses if readiness else [],
                "recommendations": readiness.recommendations if readiness else [],
            } if readiness else None,
            "success_probability": {
                "success_probability": probability.success_probability if probability else None,
                "failure_risk": probability.failure_risk if probability else None,
                "delay_risk": probability.delay_risk if probability else None,
                "confidence_score": probability.confidence_score if probability else None,
            } if probability else None,
            "bottlenecks": {
                "active": sum(1 for b in bottlenecks if b.status == "active"),
                "by_severity": bottleneck_counts,
                "recent": [
                    {"title": b.title, "severity": b.severity, "type": b.bottleneck_type}
                    for b in bottlenecks[:3]
                ],
            },
            "devils_advocate": {
                "critique_score": da.critique_score if da else None,
                "recommendations": da.recommendations if da else [],
                "created_at": da.created_at.isoformat() if da and da.created_at else None,
            } if da else None,
            "decision_memory": {
                "recent_count": len(memory_entries),
                "recent": [
                    {"title": m.title, "decision_date": m.decision_date.isoformat() if m.decision_date else None,
                     "approver": m.approver}
                    for m in memory_entries
                ],
            },
            "system_health": {
                "execution_score": 0.82,
                "coordination_score": 0.75,
                "risk_index": (sum(r.risk_score or 0 for r in risks) / len(risks)) if risks else 0,
                "trust_score": 0.88,
                "decision_quality": (sum(d.confidence or 0 for d in decisions) / len(decisions)) if decisions else 0,
                "business_readiness_score": readiness.overall_score if readiness else None,
                "success_probability_score": probability.success_probability if probability else None,
            },
        }


class ExplanationService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ExplanationRepository(session)

    async def get_explanations(
        self, entity_type: str, entity_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict[str, Any]]:
        explanations = await self._repo.list_by_entity(entity_type, entity_id, skip=skip, limit=limit)
        return [
            {
                "id": e.id,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "recommendation": e.recommendation,
                "reasoning": e.reasoning,
                "evidence": e.evidence,
                "assumptions": e.assumptions,
                "confidence": e.confidence,
                "risk_level": e.risk_level,
                "affected_departments": e.affected_departments,
                "dependencies": e.dependencies,
                "model_used": e.model_used,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in explanations
        ]