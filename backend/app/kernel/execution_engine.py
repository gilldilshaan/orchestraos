from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, cast

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.dynamic_agent import DynamicAgent
from app.kernel.agent_factory import AgentFactory
from app.kernel.ai_kernel import AIKernel
from app.kernel.event_system import EventType
from app.kernel.execution_planner import ExecutionGraph, ExecutionNode, ExecutionPlan
from app.kernel.executive_decision_engine import ExecutiveDecisionEngine
from app.kernel.reporting import (
    CEOAggregator,
    ExecutiveAggregator,
    ExecutiveReport,
    OrganizationReport,
    SpecialistReport,
    specialist_report_from_output,
)
from app.kernel.runtime_executive import (
    RuntimeExecutive,
    SpecialistInstance,
    SpecialistRequest,
)
from app.kernel.runtime_org_manager import RuntimeOrganizationManager
from app.kernel.runtime_supervisor import RuntimeSupervisor
from app.schemas.dynamic_org import DynamicOrganizationStructure

logger = logging.getLogger(__name__)


class NodeExecutionResult(BaseModel):
    """Result from executing a single node in the graph."""

    node_id: str
    title: str
    node_type: str = "unknown"
    status: str = "pending"
    execution_time: float = 0.0
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    child_results: list[dict[str, Any]] = Field(default_factory=list)


class ExecutionResults(BaseModel):
    """Final results from executing an entire plan."""

    objective_id: str
    status: str = "pending"
    node_results: dict[str, NodeExecutionResult] = Field(default_factory=dict)
    synthesis_result: dict[str, Any] = Field(default_factory=dict)
    organization_report: OrganizationReport | None = None
    executive_decision: dict[str, Any] | None = None
    total_execution_time: float = 0.0
    total_nodes: int = 0
    completed_nodes: int = 0
    failed_nodes: int = 0
    skipped_nodes: int = 0


class ExecutionEngine:
    """Executes an ExecutionPlan by walking parallel groups.

    The engine now produces typed reports (SpecialistReport, ExecutiveReport,
    OrganizationReport) internally.  Results are converted back to dicts
    at the boundary for backward compatibility.
    """

    def __init__(self, session: AsyncSession, kernel: AIKernel) -> None:
        self._session = session
        self._kernel = kernel
        self._factory = AgentFactory()
        self._cancelled = False

    # ── Public API ───────────────────────────────────────────────────────

    async def execute_plan(
        self,
        plan: ExecutionPlan,
        manager: RuntimeOrganizationManager,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> ExecutionResults:
        """Walk the plan's parallel groups and dispatch all nodes."""
        start_time = time.monotonic()
        all_node_results: dict[str, NodeExecutionResult] = {}
        synthesis_result: dict[str, Any] = {}
        org_report: OrganizationReport | None = None
        exec_decision: dict[str, Any] | None = None

        self._cancelled = False
        self._supervisor = RuntimeSupervisor(objective_id, manager)
        manager.mark_started()

        manager.emit_event(
            EventType.ORGANIZATION_CREATED,
            component="execution_engine",
            payload={
                "company_name": organization.company_name,
                "industry": organization.industry,
                "executive_count": len(organization.executives),
            },
        )

        try:
            for _group_idx, group in enumerate(plan.parallel_groups):
                if self._cancelled:
                    logger.info("Execution cancelled for %s", objective_id)
                    break

                group_results = await self._execute_parallel_group(
                    group, plan.graph, manager, objective_id, organization,
                )

                for nr in group_results:
                    all_node_results[nr.node_id] = nr
                    node = plan.graph.get_node(nr.node_id)
                    if node is not None:
                        node.execution_status = nr.status

                    if node and node.node_type == "synthesis":
                        synthesis_result = nr.output
                        org_report = nr.output.get("organization_report")
                        exec_decision = nr.output.get("executive_decision")

            total_time = time.monotonic() - start_time
            completed = sum(1 for r in all_node_results.values() if r.status == "completed")
            failed = sum(1 for r in all_node_results.values() if r.status == "failed")
            skipped = sum(1 for r in all_node_results.values() if r.status == "skipped")

            # Update run metrics
            metrics = manager.get_run_metrics()
            metrics.total_runtime = total_time
            metrics.total_nodes = len(all_node_results)
            metrics.completed_nodes = completed
            metrics.failed_nodes = failed
            exec_count = len(manager.list_executives())
            spec_count = len(manager.list_specialists())
            metrics.executive_count = exec_count
            metrics.specialist_count = spec_count
            if completed > 0:
                metrics.average_node_time = total_time / completed

            if failed > 0 and completed > 0:
                overall = "completed_with_errors"
            elif failed > 0 and completed == 0:
                overall = "failed"
            else:
                overall = "completed"

            manager.mark_completed()

            return ExecutionResults(
                objective_id=objective_id,
                status=overall,
                node_results=all_node_results,
                synthesis_result=synthesis_result,
                organization_report=org_report,
                executive_decision=exec_decision,
                total_execution_time=total_time,
                total_nodes=len(all_node_results),
                completed_nodes=completed,
                failed_nodes=failed,
                skipped_nodes=skipped,
            )

        except Exception as e:
            manager.mark_failed(str(e))
            logger.exception("ExecutionEngine failed for %s", objective_id)
            return ExecutionResults(
                objective_id=objective_id,
                status="failed",
                node_results=all_node_results,
                total_execution_time=time.monotonic() - start_time,
            )

    async def cancel(self) -> None:
        """Request cancellation — in-flight nodes complete but no new groups start."""
        self._cancelled = True

    # ── Parallel group execution ─────────────────────────────────────────

    async def _execute_parallel_group(
        self,
        group: list[str],
        graph: ExecutionGraph,
        manager: RuntimeOrganizationManager,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> list[NodeExecutionResult]:
        tasks: list[asyncio.Task[Any]] = []
        for node_id in group:
            node = graph.get_node(node_id)
            if node is None:
                continue
            node.execution_status = "running"
            tasks.append(asyncio.create_task(
                self._execute_node_with_retry(node, manager, objective_id, organization),
            ))

        results: list[NodeExecutionResult] = []
        gathered = await asyncio.gather(*tasks, return_exceptions=True)
        for node_id, res in zip(group, gathered, strict=False):
            node = graph.get_node(node_id)
            if isinstance(res, Exception):
                results.append(NodeExecutionResult(
                    node_id=node_id,
                    title=node.title if node else node_id,
                    status="failed",
                    error=str(res),
                ))
            else:
                results.append(cast(NodeExecutionResult, res))

        return results

    async def _execute_node_with_retry(
        self,
        node: ExecutionNode,
        manager: RuntimeOrganizationManager,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> NodeExecutionResult:
        task_id = f"node_{node.id}_{objective_id[:8]}"
        start_time = time.monotonic()
        retry_count = 0

        async def _execute_with_telemetry() -> dict[str, Any]:
            return await self._dispatch(node, manager, objective_id, organization)

        try:
            output, attempts = await self._kernel.retry_engine.execute(
                node.node_type, task_id, _execute_with_telemetry,
            )
            retry_count = len([a for a in attempts if a.get("error")])
            if retry_count > 0:
                metrics = manager.get_run_metrics()
                metrics.retry_count += retry_count
                manager.emit_event(
                    EventType.NODE_RETRY,
                    component="execution_engine",
                    source=node.title,
                    payload={
                        "node_id": node.id,
                        "node_type": node.node_type,
                        "retry_count": retry_count,
                        "attempts": attempts,
                    },
                )
        except Exception as e:
            elapsed = time.monotonic() - start_time
            manager.emit_event(
                EventType.RUN_FAILED,
                component="execution_engine",
                source=node.title,
                payload={
                    "node_id": node.id,
                    "node_type": node.node_type,
                    "error": str(e),
                    "execution_time": elapsed,
                },
            )
            return NodeExecutionResult(
                node_id=node.id, title=node.title,
                status="failed", execution_time=elapsed, error=str(e),
            )

        elapsed = time.monotonic() - start_time
        return NodeExecutionResult(
            node_id=node.id, title=node.title,
            node_type=node.node_type, status="completed",
            execution_time=elapsed, output=output,
        )

    async def _dispatch(
        self,
        node: ExecutionNode,
        manager: RuntimeOrganizationManager,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> dict[str, Any]:
        if node.node_type == "executive":
            return await self._handle_executive(node, manager, objective_id, organization)
        if node.node_type == "specialist":
            return await self._handle_specialist(node, manager, objective_id, organization)
        if node.node_type == "synthesis":
            return await self._handle_synthesis(node, manager, objective_id, organization)
        return {"error": f"Unknown node type: {node.node_type}"}

    # ── Executive handler ────────────────────────────────────────────────

    async def _handle_executive(
        self,
        node: ExecutionNode,
        manager: RuntimeOrganizationManager,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> dict[str, Any]:
        from app.repositories.objective_repository import ObjectiveRepository

        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        raw = objective.raw_input if objective else ""

        # Create and register runtime executive
        exec_runtime = RuntimeExecutive(
            title=node.title,
            mission=node.metadata.get("purpose", ""),
            purpose=node.metadata.get("purpose", ""),
            responsibilities=node.metadata.get("responsibilities", []),
            reporting_to="ceo",
        )
        manager.register_executive(exec_runtime)

        # Execute via DynamicAgent
        context: dict[str, Any] = {
            "title": node.title,
            "purpose": exec_runtime.purpose,
            "responsibilities": exec_runtime.responsibilities,
            "company_name": organization.company_name,
            "industry": organization.industry,
            "objective": {"raw": raw},
        }

        manager.emit_event(
            EventType.TASK_STARTED,
            component="execution_engine",
            source=node.title,
            target="executive",
            payload={"node_id": node.id, "title": node.title},
        )

        exec_output = await DynamicAgent.execute_prompt(
            task_type="executive",
            prompt_template="executive_v1.md",
            context=context,
            temperature=0.4,
            kernel=self._kernel,
        )

        exec_runtime.output = exec_output
        exec_runtime.summary = exec_output.get("summary")
        exec_runtime.status = "completed"

        # ── Publish event ────────────────────────────────────────────────
        await self._kernel.event_bus.publish(
            "org.executive_completed",
            objective_id,
            data={"title": node.title, "status": "completed"},
        )

        # Parse specialist requests
        requests = exec_runtime.request_specialists(exec_output)

        # Fall back to pre-defined specialists from blueprint
        if not requests:
            spec_details = node.metadata.get("required_specialists", {})
            if isinstance(spec_details, list):
                requests = [
                    SpecialistRequest(title=s, purpose="") for s in spec_details
                ]
            elif spec_details:
                requests = [
                    SpecialistRequest(title=k, purpose=v) for k, v in spec_details.items()
                ]

        # Create aggregator for this executive
        aggregator = ExecutiveAggregator(
            executive_id=objective_id,
            executive_title=node.title,
        )

        child_results: list[dict[str, Any]] = []
        if requests:
            instances = self._factory.create_specialists(requests, node.title)
            exec_runtime.specialists.extend(instances)
            for inst in instances:
                manager.register_specialist(inst)

            exec_runtime.assign_tasks()

            # Execute specialists concurrently → get SpecialistReports
            for inst in exec_runtime.specialists:
                manager.emit_event(
                    EventType.TASK_STARTED,
                    component="execution_engine",
                    source=inst.title,
                    target="specialist",
                    payload={
                        "title": inst.title,
                        "executive": node.title,
                    },
                )

            spec_results = await asyncio.gather(
                *(self._execute_one_specialist(
                    inst, node, organization, exec_output, objective_id,
                ) for inst in exec_runtime.specialists),
                return_exceptions=True,
            )

            for instance, res in zip(exec_runtime.specialists, spec_results, strict=False):
                if isinstance(res, Exception):
                    instance.status = "failed"
                    instance.error = str(res)
                    child_results.append({
                        "title": instance.title,
                        "status": "failed",
                        "error": str(res),
                    })
                    manager.emit_event(
                        EventType.TASK_COMPLETED,
                        component="execution_engine",
                        source=instance.title,
                        target="specialist",
                        payload={
                            "title": instance.title,
                            "executive": node.title,
                            "status": "failed",
                            "error": str(res),
                        },
                    )
                elif isinstance(res, SpecialistReport):
                    instance.status = "completed"
                    aggregator.receive_specialist_report(res)
                    child_results.append({
                        "title": instance.title,
                        "status": "completed",
                        "output": res.model_dump(),
                    })
                    exec_runtime.receive_report(instance.title, {
                        "findings": res.findings,
                        "recommendations": res.recommendations,
                        "confidence": res.confidence,
                    })
                    manager.emit_event(
                        EventType.SPECIALIST_REPORT_CREATED,
                        component="execution_engine",
                        source=instance.title,
                        target=node.title,
                        payload={
                            "title": instance.title,
                            "executive": node.title,
                            "confidence": res.confidence,
                            "findings_count": len(res.findings),
                            "recommendations_count": len(res.recommendations),
                        },
                    )

        # Produce the ExecutiveReport via aggregator
        exec_report = aggregator.produce_report(
            execution_summary=exec_runtime.summary or "",
        )
        exec_runtime.calculate_confidence()
        exec_runtime.aggregate_results()

        # ── Supervisor evaluation ────────────────────────────────────────
        if hasattr(self, "_supervisor"):
            self._supervisor.analyze(node.title)
            manager.emit_event(
                EventType.SUPERVISOR_ANALYSIS_CREATED,
                component="execution_engine",
                source=node.title,
                payload={
                    "executive": node.title,
                    "health_score": manager.supervisor_health_score(),
                    "bottleneck_count": len(manager.supervisor_bottlenecks()),
                },
            )

        manager.emit_event(
            EventType.EXECUTIVE_REPORT_CREATED,
            component="execution_engine",
            source=node.title,
            payload={
                "title": node.title,
                "confidence": exec_report.confidence,
                "summary": exec_runtime.summary,
                "specialist_count": len(child_results),
            },
        )

        return {
            "summary": exec_runtime.summary,
            "confidence": exec_report.confidence,
            "child_results": child_results,
            "raw_output": exec_output,
            "executive_report": exec_report.model_dump(),
        }

    async def _execute_one_specialist(
        self,
        instance: SpecialistInstance,
        executive_node: ExecutionNode,
        organization: DynamicOrganizationStructure,
        executive_output: dict[str, Any],
        objective_id: str,
    ) -> SpecialistReport:
        from app.repositories.objective_repository import ObjectiveRepository

        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        raw = objective.raw_input if objective else ""

        context: dict[str, Any] = {
            "title": instance.title,
            "purpose": instance.purpose,
            "responsibilities": [],
            "company_name": organization.company_name,
            "industry": organization.industry,
            "parent_title": executive_node.title,
            "executive_context": executive_output.get("summary", ""),
            "objective": {"raw": raw},
        }

        spec_start = time.monotonic()
        result = await DynamicAgent.execute_prompt(
            task_type="specialist",
            prompt_template="specialist_v1.md",
            context=context,
            temperature=0.3,
            kernel=self._kernel,
        )
        elapsed = time.monotonic() - spec_start

        await self._kernel.event_bus.publish(
            "org.specialist_completed",
            objective_id,
            data={
                "title": instance.title,
                "executive": executive_node.title,
                "status": "completed",
            },
        )

        return specialist_report_from_output(
            specialist_id=f"{objective_id}:{instance.title}",
            title=instance.title,
            executive=executive_node.title,
            output=result,
            execution_time=elapsed,
        )

    # ── Specialist handler (for pre-planned specialist nodes) ────────────

    async def _handle_specialist(
        self,
        node: ExecutionNode,
        manager: RuntimeOrganizationManager,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> dict[str, Any]:
        from app.repositories.objective_repository import ObjectiveRepository

        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        raw = objective.raw_input if objective else ""

        # Check if this specialist was already handled inline by the executive
        existing = manager.get_specialist(node.title)
        if existing is not None and existing.status == "completed":
            return {
                "summary": existing.summary,
                "output": existing.output,
                "status": "already_completed",
            }

        context: dict[str, Any] = {
            "title": node.title,
            "purpose": node.metadata.get("purpose", ""),
            "responsibilities": node.metadata.get("responsibilities", []),
            "company_name": organization.company_name,
            "industry": organization.industry,
            "parent_title": node.owner,
            "executive_context": "",
            "objective": {"raw": raw},
        }

        spec_start = time.monotonic()
        output = await DynamicAgent.execute_prompt(
            task_type="specialist",
            prompt_template="specialist_v1.md",
            context=context,
            temperature=0.3,
            kernel=self._kernel,
        )
        elapsed = time.monotonic() - spec_start

        await self._kernel.event_bus.publish(
            "org.specialist_completed",
            objective_id,
            data={
                "title": node.title,
                "executive": node.owner,
                "status": "completed",
            },
        )

        # Build a SpecialistReport for this specialist
        report = specialist_report_from_output(
            specialist_id=f"{objective_id}:{node.title}",
            title=node.title,
            executive=node.owner,
            output=output,
            execution_time=elapsed,
        )

        # Update manager if specialist already registered
        specialist = manager.get_specialist(node.title)
        if specialist is not None:
            specialist.status = "completed"
            specialist.output = output
            specialist.summary = output.get("summary")

        return {
            **output,
            "specialist_report": report.model_dump(),
        }

    # ── Synthesis handler ────────────────────────────────────────────────

    async def _handle_synthesis(
        self,
        _node: ExecutionNode,
        manager: RuntimeOrganizationManager,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> dict[str, Any]:
        from app.repositories.objective_repository import ObjectiveRepository

        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        raw = objective.raw_input if objective else ""

        # Build executive summaries from manager + reports
        executives = manager.list_executives()
        summaries = []
        exec_reports: list[ExecutiveReport] = []
        for ex in executives:
            specialists = manager.list_specialists(ex.title)
            child_info = ""
            if specialists:
                lines = [
                    f"  - {s.title}: {s.summary or 'completed'}"
                    for s in specialists if s.status == "completed"
                ]
                if lines:
                    child_info = "\n" + "\n".join(lines)

            summaries.append(f"{ex.title}: {ex.summary or 'completed'}{child_info}")

        context = {
            "objective": {"raw": raw},
            "company_name": organization.company_name,
            "industry": organization.industry,
            "executive_summaries": "\n\n".join(summaries),
        }

        synthesis = await self._kernel.run(
            task_type="ceo_synthesis",
            prompt_text=(
                "You are the CEO of {{ company_name }}, in the {{ industry }} industry.\n\n"
                "Objective: {{ objective.raw }}\n\n"
                "Your executive team completed their work. Here are their summaries:\n\n"
                "{{ executive_summaries }}\n\n"
                "Synthesize these into a final strategic report.\n\n"
                "Output JSON ONLY:\n"
                "- final_summary: overall assessment (string)\n"
                "- key_achievements: list of achievements (list of strings)\n"
                "- strategic_recommendations: list of recommendations (list of strings)\n"
                "- risks_and_mitigations: list of risk descriptions (list of strings)\n"
                "- confidence: 0.0 to 1.0\n"
                "- next_steps: list of next actions (list of strings)"
            ),
            context=context,
            temperature=0.4,
        )

        # Collect executive reports from all node results stored on manager
        # (the reports were stored in executive node outputs)
        for ex in executives:
            exec_reports.append(ExecutiveReport(
                executive_id=objective_id,
                executive_title=ex.title,
                confidence=ex.confidence or 0.0,
                execution_summary=ex.summary or "",
            ))

        cfo = CEOAggregator()
        for er in exec_reports:
            cfo.receive_executive_report(er)

        org_report = cfo.produce_organization_report(
            final_summary=synthesis.get("final_summary", ""),
            recommendations=synthesis.get("strategic_recommendations", []),
            supervisor_analyses=manager.get_supervisor_analyses(),
            supervisor_actions=manager.get_supervisor_actions(),
            health_score=manager.supervisor_health_score(),
            bottlenecks=manager.supervisor_bottlenecks(),
        )

        await self._kernel.event_bus.publish(
            "org.completed",
            objective_id,
            data={"status": "completed", "final_report": synthesis},
        )

        # ── Executive Decision Engine ────────────────────────────────────
        decision_engine = ExecutiveDecisionEngine(org_report)
        executive_decision = decision_engine.generate_decision()

        manager.emit_event(
            EventType.DECISION_CREATED,
            component="execution_engine",
            payload={
                "confidence": executive_decision.confidence,
                "decision_type": executive_decision.recommended_action,
                "option_count": len(executive_decision.tradeoffs),
            },
        )

        return {
            **synthesis,
            "organization_report": org_report.model_dump(),
            "executive_decision": executive_decision.model_dump(),
        }
