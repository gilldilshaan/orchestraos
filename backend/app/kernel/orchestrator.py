from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session_factory
from app.kernel.ai_kernel import AIKernel
from app.kernel.context_manager import ExecutionContext
from app.kernel.event_bus import EventBus
from app.services.artifact_service import ArtifactService
from app.services.execution_events import sse_manager

logger = logging.getLogger(__name__)

STAGE_LABELS: dict[str, str] = {
    "compiler": "Compiling objective",
    "readiness": "Assessing readiness",
    "planner": "Planning",
    "organization": "Building organization",
    "risk": "Analyzing risks",
    "decision": "Running decision engine",
    "devils_advocate": "Devil's advocate review",
    "success_probability": "Calculating success probability",
    "resource_gap": "Identifying resource gaps",
    "dependency_graph": "Building dependency graph",
    "bottleneck": "Detecting bottlenecks",
    "dashboard": "Aggregating dashboard",
    "scenario": "Running scenario simulation",
    "ceo_analysis": "CEO analysis",
    "dynamic_org": "Dynamic organization",
}


StepHandler = Callable[..., Awaitable[dict[str, Any]]]


CONTEXT_UPDATES: dict[str, str] = {
    "compiler": "compilation",
    "planner": "plan",
    "organization": "departments",
    "risk": "risks",
    "decision": "decisions",
    "devils_advocate": "devils_advocate",
    "readiness": "readiness",
    "missing_info": "missing_info",
    "success_probability": "success_probability",
    "resource_gap": "resource_gaps",
    "dependency_graph": "dependency_graph",
    "bottleneck": "bottlenecks",
    "dashboard": "dashboard",
    "scenario": "scenario",
    "ceo_analysis": "ceo_analysis",
    "dynamic_org": "dynamic_org",
}


class PipelineStep:
    def __init__(
        self,
        name: str,
        handler: StepHandler,
        depends_on: list[str] | None = None,
        optional: bool = False,
        timeout_seconds: int = 120,
        context_field: str | None = None,
    ) -> None:
        self.name = name
        self.handler = handler
        self.depends_on = depends_on or []
        self.optional = optional
        self.timeout_seconds = timeout_seconds
        self.context_field = context_field or CONTEXT_UPDATES.get(name)
        self.result: dict[str, Any] | None = None
        self.error: str | None = None
        self.started_at: datetime | None = None
        self.completed_at: datetime | None = None
        self.status: str = "pending"


class AgentOrchestrator:
    """Orchestrates the full agent pipeline with dependency resolution,
    retries, partial failure handling, and context sharing.

    Resolves step dependencies (DAG), runs steps in dependency order,
    supports optional steps (non-fatal failures), shares ExecutionContext
    across all steps, and publishes events for each completed step.

    When an ArtifactService is provided, every lifecycle event is
    automatically persisted to the execution artifact store and
    per-step agent telemetry is captured.
    """

    def __init__(
        self,
        session: AsyncSession,
        kernel: AIKernel,
        event_bus: EventBus | None = None,
        artifact_service: ArtifactService | None = None,
    ) -> None:
        self._session = session
        self._kernel = kernel
        self._event_bus = event_bus or kernel.event_bus
        self._artifact_service = artifact_service
        self._artifact_session: AsyncSession | None = None

    def _ensure_artifact_session(self) -> AsyncSession:
        """Return a dedicated session for artifact persistence so it never
        conflicts with the main pipeline session."""
        if self._artifact_session is None:
            self._artifact_session = async_session_factory()
        if self._artifact_service is None:
            self._artifact_service = ArtifactService(self._artifact_session)
        return self._artifact_session

    async def _persist_event(
        self,
        objective_id: str,
        stage: str,
        status: str,
        *,
        message: str | None = None,
        progress: float = 0.0,
        event_order: int = 0,
    ) -> None:
        session = self._ensure_artifact_session()
        svc = self._artifact_service
        if not svc:
            return
        await svc.persist_event(
            objective_id, stage, status,
            message=message, progress=progress, event_order=event_order,
        )

    async def _persist_telemetry(
        self,
        objective_id: str,
        step: PipelineStep,
        status: str,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        self._ensure_artifact_session()
        svc = self._artifact_service
        if not svc:
            return
        stats = self._kernel.get_stats()
        recent_calls = self._kernel.observability.get_recent_calls(10)
        step_records = [r for r in recent_calls if r["task_type"] == step.name]
        last_call = step_records[-1] if step_records else None

        runtime_ms = None
        if step.started_at:
            end = step.completed_at or datetime.now(UTC)
            runtime_ms = (end - step.started_at).total_seconds() * 1000

        provider = self._kernel.model_router.get_preferred_provider(step.name)
        route = self._kernel.model_router.get_route(step.name)
        model = route.get("model", last_call.get("model") if last_call else None)
        temperature = route.get("temperature")

        await svc.persist_telemetry(
            objective_id=objective_id,
            agent_id=f"{step.name}_{objective_id[:8]}",
            stage=step.name,
            status=status,
            agent_name=STAGE_LABELS.get(step.name, step.name.replace("_", " ").title()),
            start_time=step.started_at,
            finish_time=step.completed_at,
            runtime_ms=runtime_ms,
            provider=provider,
            model=model,
            temperature=temperature,
            prompt_tokens=last_call.get("input_tokens") if last_call else None,
            completion_tokens=last_call.get("output_tokens") if last_call else None,
            total_tokens=(
                (last_call.get("input_tokens", 0) + last_call.get("output_tokens", 0))
                if last_call else None
            ),
            input_cost=stats.get("total_cost") if last_call else None,
            output_cost=last_call.get("estimated_cost") if last_call else None,
            total_cost=last_call.get("estimated_cost") if last_call else None,
            retries=last_call.get("retry_count", 0) if last_call else 0,
            error=error,
            confidence=result.get("confidence") if result else None,
            reasoning_summary=result.get("reasoning") if result else None,
            tool_calls=result.get("tool_calls") if result else None,
            artifacts_produced=result.get("artifacts_produced") if result else None,
        )

    def _update_context(self, step: PipelineStep, result: dict[str, Any], context: ExecutionContext) -> None:
        field = step.context_field
        if field is None:
            return
        if field == "plan":
            context.plan = result
        elif field == "compilation":
            context.compilation = result.get("data")
        elif field == "departments":
            context.departments = result.get("departments", [])
        elif field == "risks":
            context.risks = result.get("risks", [])
        elif field == "decisions":
            context.decisions = [result]
        elif field == "devils_advocate":
            context.devils_advocate = result.get("data", result)
        elif field == "readiness":
            context.readiness = result
        elif field == "bottlenecks":
            context.bottlenecks = result.get("bottlenecks", [])
        elif field == "missing_info":
            context.missing_info = result
        elif field == "success_probability":
            context.success_probability = result
        elif field == "resource_gaps":
            context.resource_gaps = result
        elif field == "dependency_graph":
            context.dependency_graph = result
        elif field == "ceo_analysis":
            context.ceo_analysis = result
        elif field == "dynamic_org":
            context.dynamic_org = result
        else:
            pass

    async def _execute_single_step(
        self,
        step: PipelineStep,
        objective_id: str,
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Execute a single pipeline step and return its result."""
        step.status = "running"
        step.started_at = datetime.now(UTC)
        label = STAGE_LABELS.get(step.name, step.name.replace("_", " ").title())
        await sse_manager.emit_stage(
            objective_id,
            stage=step.name,
            status="started",
            message=label,
            progress=0.0,
        )
        await self._persist_event(
            objective_id, step.name, "started",
            message=f"{label} started", event_order=0,
        )
        coro = step.handler(
            objective_id=objective_id,
            context=context,
            session=self._session,
            kernel=self._kernel,
        )
        return await asyncio.wait_for(coro, timeout=step.timeout_seconds)

    async def _handle_step_success(
        self,
        step: PipelineStep,
        result: dict[str, Any],
        objective_id: str,
        context: ExecutionContext,
        completed: set[str],
        results: dict[str, Any],
    ) -> None:
        """Process a successful step result."""
        step.result = result
        step.status = "completed"
        step.completed_at = datetime.now(UTC)
        completed.add(step.name)
        results[step.name] = result
        self._update_context(step, result, context)
        label = STAGE_LABELS.get(step.name, step.name.replace("_", " ").title())
        await sse_manager.emit_stage(
            objective_id,
            stage=step.name,
            status="completed",
            message=f"{label} complete",
            progress=0.0,
        )
        await self._persist_event(
            objective_id, step.name, "completed",
            message=f"{label} complete", event_order=0,
        )
        await self._persist_telemetry(objective_id, step, "completed", result=result)
        await self._event_bus.publish(
            f"{step.name}.completed",
            objective_id,
            data={"result": result, "step": step.name},
            context=context,
        )

    async def _handle_step_error(
        self,
        step: PipelineStep,
        error: Exception,
        objective_id: str,
        context: ExecutionContext,
        completed: set[str],
        results: dict[str, Any],
        errors: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Handle a step failure. Returns a failure response or None if optional."""
        is_timeout = isinstance(error, asyncio.TimeoutError)
        error_msg = f"Timed out after {step.timeout_seconds}s" if is_timeout else str(error)
        step.status = "failed"
        step.completed_at = datetime.now(UTC)
        errors.append({
            "step": step.name,
            "error": error_msg,
            "timestamp": datetime.now(UTC).isoformat(),
        })
        label = STAGE_LABELS.get(step.name, step.name.replace("_", " ").title())
        await sse_manager.emit_stage(
            objective_id,
            stage=step.name,
            status="error",
            message=f"{label} failed: {error_msg}",
            progress=0.0,
        )
        await self._persist_event(
            objective_id, step.name, "failed",
            message=f"{label} failed: {error_msg}", event_order=0,
        )
        await self._persist_telemetry(objective_id, step, "failed", error=error_msg)

        if is_timeout and not step.optional:
            context.errors.append({"step": step.name, "error": error_msg})
            return {
                "status": "failed",
                "error": f"Pipeline timed out at step '{step.name}': {error_msg}",
            }

        if not is_timeout and not step.optional:
            context.errors.append({"step": step.name, "error": str(error)})
            return {
                "status": "failed",
                "error": f"Pipeline failed at step '{step.name}': {error}",
            }

        # Optional step failure — record and continue
        completed.add(step.name)
        results[step.name] = {"error": error_msg, "skipped": True}
        return None

    def _find_ready_steps(
        self,
        steps: list[PipelineStep],
        completed: set[str],
        running: set[str],
    ) -> list[PipelineStep]:
        """Find steps whose dependencies are all met and are not yet running/completed."""
        return [
            s
            for s in steps
            if s.name not in completed
            and s.name not in running
            and s.status != "skipped"
            and all(dep in completed for dep in s.depends_on)
        ]

    async def _progress(self, completed: set[str], total: int) -> float:
        return round((len(completed) / total) * 100, 1) if total else 0.0

    async def run_pipeline(
        self,
        objective_id: str,
        steps: list[PipelineStep],
    ) -> dict[str, Any]:
        context = self._kernel.context_manager.get_or_create(objective_id)
        context.objective_id = objective_id

        completed: set[str] = set()
        results: dict[str, Any] = {}
        errors: list[dict[str, Any]] = []
        total_steps = len(steps)

        await sse_manager.emit_stage(
            objective_id,
            stage="pipeline",
            status="started",
            message="Pipeline started",
            progress=0.0,
        )
        await self._persist_event(
            objective_id, "pipeline", "started",
            message="Pipeline started", progress=0.0, event_order=-1,
        )

        while len(completed) < total_steps:
            ready = self._find_ready_steps(steps, completed, set())

            if not ready:
                remaining = [s.name for s in steps if s.name not in completed and s.status != "skipped"]
                if remaining:
                    logger.warning("Pipeline deadlock detected: remaining steps %s", remaining)
                    errors.append({
                        "step": "orchestrator",
                        "error": f"Deadlock detected: remaining steps {remaining} cannot proceed",
                    })
                break

            # Run ready steps sequentially to avoid session conflicts
            step_results: list[Exception | dict[str, Any]] = []
            for s in ready:
                try:
                    result = await self._execute_single_step(s, objective_id, context)
                except Exception as exc:
                    result = exc
                step_results.append(result)

            for step, result in zip(ready, step_results):
                if isinstance(result, Exception):
                    err = await self._handle_step_error(
                        step, result, objective_id, context,
                        completed, results, errors,
                    )
                    if err is not None:
                        err["completed_steps"] = list(completed)
                        err["results"] = results
                        err["errors"] = errors
                        await sse_manager.emit_stage(
                            objective_id,
                            stage="pipeline",
                            status="error",
                            message=err.get("error", "Pipeline failed"),
                            progress=await self._progress(completed, total_steps),
                        )
                        await self._persist_event(
                            objective_id, "pipeline", "failed",
                            message=err.get("error", "Pipeline failed"),
                            progress=await self._progress(completed, total_steps),
                            event_order=-1,
                        )
                        return err

                    # Optional step failure published via event bus
                    await self._event_bus.publish(
                        f"{step.name}.failed",
                        objective_id,
                        data={"error": str(result)},
                        context=context,
                    )
                else:
                    await self._handle_step_success(
                        step, result, objective_id, context,
                        completed, results,
                    )

                await sse_manager.emit_stage(
                    objective_id,
                    stage="pipeline",
                    status="progress",
                    message=f"Completed step: {step.name}",
                    progress=await self._progress(completed, total_steps),
                )

        pipeline_status = "completed" if not errors else "completed_with_errors"
        await sse_manager.emit_stage(
            objective_id,
            stage="pipeline",
            status=pipeline_status,
            message="Pipeline finished",
            progress=100.0,
        )
        await self._persist_event(
            objective_id, "pipeline", pipeline_status,
            message="Pipeline finished",
            progress=100.0, event_order=-1,
        )

        # Save execution snapshot at pipeline completion
        if self._artifact_service:
            try:
                from app.services.engine import DashboardAggregator
                aggregator = DashboardAggregator(self._session)
                dashboard = await aggregator.get_dashboard(objective_id)
                stats = self._kernel.get_stats()

                snapshot_data = {
                    "dashboard": dashboard,
                    "stats": stats,
                    "completed_steps": list(completed),
                    "results_count": len(results),
                }
                await self._artifact_service.save_snapshot(
                    objective_id, snapshot_data,
                    snapshot_version=1,
                )
            except Exception:
                logger.exception("Failed to save execution snapshot")

        return {
            "status": pipeline_status,
            "completed_steps": list(completed),
            "results": results,
            "errors": errors if errors else None,
        }
