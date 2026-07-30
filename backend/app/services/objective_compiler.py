from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ceo_agent import CEOAgent
from app.agents.devils_advocate_agent import DevilsAdvocateAgent
from app.agents.organization_executor import OrganizationExecutor
from app.agents.organization_generator import OrganizationGenerator
from app.agents.tasks import (
    DecisionAgent,
    OrganizationAgent,
    PlannerAgent,
    RiskAgent,
)
from app.kernel import ai_kernel
from app.kernel.intelligence_engine import IntelligenceEngine
from app.kernel.orchestrator import AgentOrchestrator, PipelineStep
from app.kernel.state_machine import WorkflowStateMachine
from app.models.extensions import ObjectiveCompilation
from app.repositories.extensions_repository import ObjectiveCompilationRepository
from app.repositories.objective_repository import ObjectiveRepository
from app.services.artifact_service import ArtifactService


logger = logging.getLogger(__name__)


class ObjectiveCompilerService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._obj_repo = ObjectiveRepository(session)
        self._comp_repo = ObjectiveCompilationRepository(session)

    async def compile(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await ai_kernel.run(
            task_type="compile",
            prompt_template="compiler_v1.md",
            context=context,
        )

        existing = await self._comp_repo.get_by_objective(objective_id)
        model_fields = {
            "mission", "vision", "business_type", "industry",
            "stakeholders", "kpis", "timeline", "budget",
            "dependencies", "assumptions", "risks", "success_metrics",
        }
        if existing:
            compilation = existing
            update_data = {k: v for k, v in result.items() if v is not None and k in model_fields}
            await self._comp_repo.update(compilation.id, update_data)
        else:
            compilation = ObjectiveCompilation(
                objective_id=objective_id,
                mission=result.get("mission"),
                vision=result.get("vision"),
                business_type=result.get("business_type"),
                industry=result.get("industry"),
                stakeholders=result.get("stakeholders"),
                kpis=result.get("kpis"),
                timeline=result.get("timeline"),
                budget=result.get("budget"),
                dependencies=result.get("dependencies"),
                assumptions=result.get("assumptions"),
                risks=result.get("risks"),
                success_metrics=result.get("success_metrics"),
            )
            compilation = await self._comp_repo.create(compilation)

        await self._transition_state(objective_id, "compiled")

        return {"compilation_id": compilation.id, "data": result}

    async def run_full_pipeline(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        # Step 0: Check for missing information (skipped if input is sufficiently detailed)
        has_critical_fields = any(
            keyword in (objective.raw_input or "").lower()
            for keyword in ["budget", "timeline", "audience", "constraint", "metric", "revenue", "market"]
        )
        if not has_critical_fields:
            from app.services.missing_info_detector import MissingInfoDetectorService

            missing_info_service = MissingInfoDetectorService(self._session)
            missing_check = await missing_info_service.check(objective_id)
            if not missing_check.get("is_complete", False):
                return {
                    "status": "needs_clarification",
                    "missing_info_check": missing_check,
                    "message": "Critical information is missing. Please provide clarification first.",
                }

        # ── Pipeline step handlers ────────────────────────────────────────

        async def _compile_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            return await self.compile(objective_id)

        async def _readiness_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            from app.services.business_readiness import BusinessReadinessService
            svc = BusinessReadinessService(self._session)
            result = await svc.assess(objective_id)
            return result

        async def _plan_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            planner = PlannerAgent(self._session, kernel=ai_kernel)
            result = await planner.run(objective_id)
            await self._transition_state(objective_id, "planned")
            return result

        async def _org_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            agent = OrganizationAgent(self._session, kernel=ai_kernel)
            result = await agent.run(objective_id)
            await self._transition_state(objective_id, "organized")
            return result

        async def _risk_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            agent = RiskAgent(self._session, kernel=ai_kernel)
            result = await agent.run(objective_id)
            await self._transition_state(objective_id, "risks_analyzed")
            return result

        async def _decision_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            agent = DecisionAgent(self._session, kernel=ai_kernel)
            result = await agent.run(objective_id)
            await self._transition_state(objective_id, "decision_pending")
            return result

        async def _devils_advocate_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            agent = DevilsAdvocateAgent(self._session, kernel=ai_kernel)
            return await agent.run(objective_id)

        async def _success_prob_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            from app.services.success_probability import SuccessProbabilityService
            svc = SuccessProbabilityService(self._session)
            return await svc.calculate(objective_id)

        async def _resource_gap_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            from app.services.resource_gap import ResourceGapService
            svc = ResourceGapService(self._session)
            return await svc.analyze(objective_id)

        async def _dep_graph_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            from app.services.dependency_engine import DependencyEngineService
            svc = DependencyEngineService(self._session)
            return await svc.build_graph(objective_id)

        async def _bottleneck_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            from app.services.bottleneck_detection import BottleneckDetectionService
            svc = BottleneckDetectionService(self._session)
            return await svc.scan(objective_id)

        async def _dashboard_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            from app.agents.tasks import DashboardAgent
            from app.services.engine import DashboardAggregator
            agent = DashboardAgent(self._session, kernel=ai_kernel)
            try:
                await agent.run(objective_id)
            except Exception:
                logger.exception("DashboardAgent report generation failed, continuing with aggregator only")
            aggregator = DashboardAggregator(self._session)
            return await aggregator.get_dashboard(objective_id)

        async def _scenario_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            from app.services.scenario_simulator import ScenarioSimulatorService
            svc = ScenarioSimulatorService(self._session)
            return await svc.simulate(objective_id)

        # ── Pipeline definition ──────────────────────────────────────────

        core_steps = [
            PipelineStep("compiler", _compile_step, depends_on=[], optional=False),
            PipelineStep("readiness", _readiness_step, depends_on=["compiler"], optional=False),
            PipelineStep("planner", _plan_step, depends_on=["readiness"], optional=False),
            PipelineStep("organization", _org_step, depends_on=["planner"], optional=False),
            PipelineStep("risk", _risk_step, depends_on=["organization"], optional=False),
            PipelineStep("decision", _decision_step, depends_on=["risk"], optional=False),
            PipelineStep("devils_advocate", _devils_advocate_step, depends_on=["decision"], optional=True),
        ]

        analysis_steps = [
            PipelineStep("success_probability", _success_prob_step, depends_on=["decision"], optional=True),
            PipelineStep("resource_gap", _resource_gap_step, depends_on=["organization"], optional=True),
            PipelineStep("dependency_graph", _dep_graph_step, depends_on=["decision"], optional=True),
            PipelineStep("bottleneck", _bottleneck_step, depends_on=["dependency_graph"], optional=True),
            PipelineStep("dashboard", _dashboard_step, depends_on=[
                "devils_advocate", "success_probability", "resource_gap", "bottleneck",
            ], optional=True),
            PipelineStep("scenario", _scenario_step, depends_on=["dashboard"], optional=True),
        ]

        steps = core_steps + analysis_steps

        artifact_svc = ArtifactService(self._session)
        orchestrator = AgentOrchestrator(self._session, ai_kernel, artifact_service=artifact_svc)
        pipeline_result = await orchestrator.run_pipeline(objective_id, steps)

        if pipeline_result["status"] == "failed":
            await self._transition_state(objective_id, "failed")
            return pipeline_result

        await self._transition_state(objective_id, "completed")

        # Generate explainable AI metadata for the full pipeline
        try:
            from app.services.explainable_ai import ExplainableAIService as ExplainableService
            explain = ExplainableService(self._session)
            await explain.generate_pipeline_explanation(objective_id, pipeline_result)
        except Exception:
            logger.exception("Failed to generate pipeline explanation")

        return {
            "compilation": pipeline_result["results"].get("compiler"),
            "readiness": pipeline_result["results"].get("readiness"),
            "plan": pipeline_result["results"].get("planner"),
            "organization": pipeline_result["results"].get("organization"),
            "risks": pipeline_result["results"].get("risk"),
            "decision": pipeline_result["results"].get("decision"),
            "devils_advocate": pipeline_result["results"].get("devils_advocate"),
            "success_probability": pipeline_result["results"].get("success_probability"),
            "resource_gaps": pipeline_result["results"].get("resource_gap"),
            "dependency_graph": pipeline_result["results"].get("dependency_graph"),
            "bottlenecks": pipeline_result["results"].get("bottleneck"),
            "dashboard": pipeline_result["results"].get("dashboard"),
            "scenario": pipeline_result["results"].get("scenario"),
            "pipeline": {
                "status": pipeline_result["status"],
                "completed_steps": pipeline_result["completed_steps"],
                "errors": pipeline_result["errors"],
            },
            "status": "completed",
        }

    async def run_dynamic_pipeline(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        await self._transition_state(objective_id, "executing")

        # Step 1: Intelligence Engine analyzes the objective
        engine = IntelligenceEngine(self._session, kernel=ai_kernel)
        intelligence = await engine.analyze(objective_id)

        await ai_kernel.event_bus.publish(
            "org.intelligence_ready",
            objective_id,
            data={
                "domain": intelligence.domain,
                "complexity": intelligence.complexity,
                "estimated_team_size": intelligence.estimated_team_size,
            },
        )

        # Step 2: CEO sets strategy and tone (deliberation deferred to Phase 9)
        ceo = CEOAgent(self._session, kernel=ai_kernel)
        ceo_analysis = await ceo.run(objective_id)
        if "error" in ceo_analysis:
            await self._transition_state(objective_id, "failed")
            return {"error": f"CEO analysis failed: {ceo_analysis['error']}"}

        # Step 3: Organization Generator builds the custom org structure
        org_gen = OrganizationGenerator(self._session, kernel=ai_kernel)
        organization = await org_gen.generate(objective_id, intelligence)

        # Step 4: Organization Executor runs the dynamic org hierarchy
        executor = OrganizationExecutor(self._session, ai_kernel)
        org_result = await executor.execute(objective_id, organization)

        # Step 5: Save context
        context = ai_kernel.context_manager.get_or_create(objective_id)
        context.ceo_analysis = ceo_analysis
        context.dynamic_org = org_result
        context.metadata["pipeline_mode"] = "dynamic_org"
        context.metadata["organization_name"] = organization.company_name
        context.metadata["intelligence"] = intelligence.model_dump()

        await self._transition_state(objective_id, "completed")

        return {
            "intelligence": intelligence.model_dump(),
            "ceo_analysis": ceo_analysis,
            "organization": {
                "company_name": organization.company_name,
                "industry": organization.industry,
                "executives": [
                    {"title": e.title, "purpose": e.purpose}
                    for e in organization.executives
                ],
            },
            "results": [
                {
                    "title": r["title"],
                    "role_type": r["role_type"],
                    "status": r["status"],
                    "summary": r.get("summary"),
                }
                for r in org_result.get("results", [])
            ],
            "final_report": org_result.get("final_report"),
            "status": "completed",
        }

    async def _transition_state(
        self, objective_id: str, target_state: str
    ) -> None:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return

        current = objective.status
        try:
            new_state = WorkflowStateMachine.transition(current, target_state)
            stage = WorkflowStateMachine.get_stage(new_state)
            await self._obj_repo.update(objective_id, {
                "status": new_state,
                "current_stage": stage,
            })

            await ai_kernel.event_bus.publish(
                "objective.state_changed",
                objective_id,
                data={"from": current, "to": new_state, "stage": stage},
            )
        except ValueError:
            logger.warning("Invalid state transition: %s -> %s", current, target_state)
