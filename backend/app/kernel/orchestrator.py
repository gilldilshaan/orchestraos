from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel.ai_kernel import AIKernel
from app.kernel.context_manager import ExecutionContext
from app.kernel.event_bus import EventBus

logger = logging.getLogger(__name__)


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
    """

    def __init__(
        self,
        session: AsyncSession,
        kernel: AIKernel,
        event_bus: EventBus | None = None,
    ) -> None:
        self._session = session
        self._kernel = kernel
        self._event_bus = event_bus or kernel.event_bus

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
        await self._event_bus.publish(
            f"{step.name}.completed",
            objective_id,
            data={"result": result, "step": step.name},
            context=context,
        )

    def _handle_step_error(
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

        while len(completed) < len(steps):
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

            # Run all ready steps concurrently
            step_results = await asyncio.gather(
                *(self._execute_single_step(s, objective_id, context) for s in ready),
                return_exceptions=True,
            )

            for step, result in zip(ready, step_results):
                if isinstance(result, Exception):
                    err = self._handle_step_error(
                        step, result, objective_id, context,
                        completed, results, errors,
                    )
                    if err is not None:
                        err["completed_steps"] = list(completed)
                        err["results"] = results
                        err["errors"] = errors
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

        return {
            "status": "completed" if not errors else "completed_with_errors",
            "completed_steps": list(completed),
            "results": results,
            "errors": errors if errors else None,
        }
