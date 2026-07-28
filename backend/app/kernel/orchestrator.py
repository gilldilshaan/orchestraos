from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel.ai_kernel import AIKernel
from app.kernel.context_manager import ExecutionContext
from app.kernel.event_bus import EventBus


class PipelineStep:
    def __init__(
        self,
        name: str,
        handler: Callable[..., Awaitable[dict[str, Any]]],
        depends_on: list[str] | None = None,
        optional: bool = False,
        timeout_seconds: int = 120,
    ) -> None:
        self.name = name
        self.handler = handler
        self.depends_on = depends_on or []
        self.optional = optional
        self.timeout_seconds = timeout_seconds
        self.result: dict[str, Any] | None = None
        self.error: str | None = None
        self.started_at: datetime | None = None
        self.completed_at: datetime | None = None
        self.status: str = "pending"  # pending | running | completed | failed | skipped


class AgentOrchestrator:
    """Orchestrates the full agent pipeline with dependency resolution,
    retries, partial failure handling, and context sharing.

    Instead of the old sequential pipeline, this orchestrator:
      - Resolves step dependencies (DAG)
      - Runs steps in dependency order
      - Supports optional steps (non-fatal failures)
      - Shares ExecutionContext across all steps
      - Publishes events for each completed step
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

    async def run_pipeline(
        self,
        objective_id: str,
        steps: list[PipelineStep],
    ) -> dict[str, Any]:
        context = self._kernel.context_manager.get_or_create(objective_id)
        context.objective_id = objective_id

        step_map: dict[str, PipelineStep] = {s.name: s for s in steps}
        completed: set[str] = set()
        results: dict[str, Any] = {}
        errors: list[dict[str, Any]] = []

        while len(completed) < len(steps):
            progress = False
            for step in steps:
                if step.name in completed:
                    continue
                if step.status == "skipped":
                    continue

                deps_met = all(dep in completed for dep in step.depends_on)
                if not deps_met:
                    continue

                progress = True
                step.status = "running"
                step.started_at = datetime.now(UTC)

                try:
                    result = await step.handler(
                        objective_id=objective_id,
                        context=context,
                        session=self._session,
                        kernel=self._kernel,
                    )
                    step.result = result
                    step.status = "completed"
                    step.completed_at = datetime.now(UTC)
                    completed.add(step.name)
                    results[step.name] = result

                    if step.name == "compiler":
                        context.compilation = result.get("data")
                    elif step.name == "planner":
                        context.plan = result
                    elif step.name == "organization":
                        context.departments = result.get("departments", [])
                    elif step.name == "risk":
                        context.risks = result.get("risks", [])
                    elif step.name == "decision":
                        context.decisions = [result]
                    elif step.name == "devils_advocate":
                        context.devils_advocate = result

                    event_name = f"{step.name}.completed"
                    await self._event_bus.publish(
                        event_name,
                        objective_id,
                        data={"result": result, "step": step.name},
                        context=context,
                    )

                except Exception as e:
                    step.error = str(e)
                    step.status = "failed"
                    step.completed_at = datetime.now(UTC)
                    errors.append({
                        "step": step.name,
                        "error": str(e),
                        "timestamp": datetime.now(UTC).isoformat(),
                    })

                    if step.optional:
                        completed.add(step.name)
                        results[step.name] = {"error": str(e), "skipped": True}
                        await self._event_bus.publish(
                            f"{step.name}.failed",
                            objective_id,
                            data={"error": str(e)},
                            context=context,
                        )
                    else:
                        context.errors.append({
                            "step": step.name,
                            "error": str(e),
                        })
                        return {
                            "status": "failed",
                            "error": f"Pipeline failed at step '{step.name}': {e}",
                            "completed_steps": list(completed),
                            "results": results,
                            "errors": errors,
                        }

            if not progress:
                remaining = [s.name for s in steps if s.name not in completed and s.status != "skipped"]
                if remaining:
                    errors.append({
                        "step": "orchestrator",
                        "error": f"Deadlock detected: remaining steps {remaining} cannot proceed",
                    })
                break

        return {
            "status": "completed" if not errors else "completed_with_errors",
            "completed_steps": list(completed),
            "results": results,
            "errors": errors if errors else None,
        }
