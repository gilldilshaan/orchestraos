from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tasks import (
    DecisionAgent,
    OrganizationAgent,
    PlannerAgent,
    RiskAgent,
)
from app.kernel import ai_kernel
from app.kernel.event_bus import EventBus
from app.kernel.orchestrator import AgentOrchestrator, PipelineStep
from app.kernel.state_machine import WorkflowStateMachine
from app.llm.client import llm_client
from app.models.extensions import ObjectiveCompilation
from app.repositories.extensions_repository import ObjectiveCompilationRepository
from app.repositories.objective_repository import ObjectiveRepository


class ObjectiveCompilerService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._obj_repo = ObjectiveRepository(session)
        self._comp_repo = ObjectiveCompilationRepository(session)

    async def compile(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        # Use AIKernel with prompt template for compilation
        context = {
            "objective": {"raw": objective.raw_input},
        }

        result = await ai_kernel.run(
            task_type="compile",
            prompt_template="compiler_v1.md",
            context=context,
        )

        existing = await self._comp_repo.get_by_objective(objective_id)
        if existing:
            compilation = existing
            update_data = {k: v for k, v in result.items() if v is not None}
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

        # Step 0: Check for missing information
        from app.services.missing_info_detector import MissingInfoDetectorService

        missing_info_service = MissingInfoDetectorService(self._session)
        missing_check = await missing_info_service.check(objective_id)
        if not missing_check.get("is_complete", False):
            return {
                "status": "needs_clarification",
                "missing_info_check": missing_check,
                "message": "Critical information is missing. Please provide clarification first.",
            }

        # Use the AgentOrchestrator with PipelineSteps
        async def _compile_step(objective_id: str, **kwargs: Any) -> dict[str, Any]:
            return await self.compile(objective_id)

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

        steps = [
            PipelineStep("compiler", _compile_step, depends_on=[]),
            PipelineStep("planner", _plan_step, depends_on=["compiler"]),
            PipelineStep("organization", _org_step, depends_on=["planner"]),
            PipelineStep("risk", _risk_step, depends_on=["organization"]),
            PipelineStep("decision", _decision_step, depends_on=["risk"]),
        ]

        orchestrator = AgentOrchestrator(self._session, ai_kernel)
        pipeline_result = await orchestrator.run_pipeline(objective_id, steps)

        if pipeline_result["status"] == "failed":
            await self._transition_state(objective_id, "failed")
            return pipeline_result

        return {
            "compilation": pipeline_result["results"].get("compiler"),
            "plan": pipeline_result["results"].get("planner"),
            "organization": pipeline_result["results"].get("organization"),
            "risks": pipeline_result["results"].get("risk"),
            "decision": pipeline_result["results"].get("decision"),
            "pipeline": pipeline_result,
            "status": "pending_approval",
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
                f"objective.state_changed",
                objective_id,
                data={"from": current, "to": new_state, "stage": stage},
            )
        except ValueError:
            pass
