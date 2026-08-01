from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.extensions import AgentTelemetry, ExecutionSnapshot, StoredExecutionEvent
from app.repositories import (
    AgentTelemetryRepository,
    ExecutionSnapshotRepository,
    StoredExecutionEventRepository,
)


class ArtifactService:
    """Persistence layer for execution artifacts and agent telemetry."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._event_repo = StoredExecutionEventRepository(session)
        self._telemetry_repo = AgentTelemetryRepository(session)
        self._snapshot_repo = ExecutionSnapshotRepository(session)

    # ── Events ────────────────────────────────────────────────────────────

    async def persist_event(
        self,
        objective_id: str,
        stage: str,
        status: str,
        *,
        message: str | None = None,
        progress: float = 0.0,
        event_order: int = 0,
    ) -> dict[str, Any]:
        event = StoredExecutionEvent(
            objective_id=objective_id,
            stage=stage,
            status=status,
            message=message,
            progress=progress,
            event_order=event_order,
        )
        created = await self._event_repo.create(event)
        await self._session.commit()
        return {
            "id": created.id,
            "objective_id": created.objective_id,
            "stage": created.stage,
            "status": created.status,
            "message": created.message,
            "progress": created.progress,
            "event_order": created.event_order,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def get_events(
        self, objective_id: str, *, skip: int = 0, limit: int = 500
    ) -> dict[str, Any]:
        events = await self._event_repo.list_by_objective(
            objective_id, skip=skip, limit=limit
        )
        return {
            "events": [
                {
                    "id": e.id,
                    "objective_id": e.objective_id,
                    "stage": e.stage,
                    "status": e.status,
                    "message": e.message,
                    "progress": e.progress,
                    "event_order": e.event_order,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in events
            ],
            "total": len(events),
        }

    async def clear_events(self, objective_id: str) -> dict[str, Any]:
        await self._event_repo.delete_by_objective(objective_id)
        await self._session.commit()
        return {"cleared": True}

    # ── Telemetry ─────────────────────────────────────────────────────────

    async def persist_telemetry(
        self,
        objective_id: str,
        agent_id: str,
        stage: str,
        status: str,
        *,
        agent_name: str | None = None,
        role: str | None = None,
        department: str | None = None,
        start_time: datetime | None = None,
        finish_time: datetime | None = None,
        runtime_ms: float | None = None,
        provider: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        prompt_tokens: int | None = None,
        completion_tokens: int | None = None,
        total_tokens: int | None = None,
        input_cost: float | None = None,
        output_cost: float | None = None,
        total_cost: float | None = None,
        retries: int = 0,
        timeout_seconds: int | None = None,
        error: str | None = None,
        parent_agents: dict[str, Any] | None = None,
        child_agents: dict[str, Any] | None = None,
        upstream: list[Any] | None = None,
        downstream: list[Any] | None = None,
        tool_calls: list[Any] | None = None,
        reasoning_summary: str | None = None,
        decision_summary: str | None = None,
        artifacts_produced: list[Any] | None = None,
        confidence: float | None = None,
        output_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        telemetry = AgentTelemetry(
            objective_id=objective_id,
            agent_id=agent_id,
            stage=stage,
            status=status,
            agent_name=agent_name,
            role=role,
            department=department,
            start_time=start_time,
            finish_time=finish_time,
            runtime_ms=runtime_ms,
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            input_cost=input_cost,
            output_cost=output_cost,
            total_cost=total_cost,
            retries=retries,
            timeout_seconds=timeout_seconds,
            error=error,
            parent_agents=parent_agents,
            child_agents=child_agents,
            upstream=upstream,
            downstream=downstream,
            tool_calls=tool_calls,
            reasoning_summary=reasoning_summary,
            decision_summary=decision_summary,
            artifacts_produced=artifacts_produced,
            confidence=confidence,
            output_metadata=output_metadata,
        )
        created = await self._telemetry_repo.create(telemetry)
        await self._session.commit()
        return {"id": created.id, "agent_id": created.agent_id}

    async def get_telemetry(
        self, objective_id: str, *, skip: int = 0, limit: int = 200
    ) -> dict[str, Any]:
        records = await self._telemetry_repo.list_by_objective(
            objective_id, skip=skip, limit=limit
        )
        return {
            "telemetry": [
                {
                    "id": r.id,
                    "objective_id": r.objective_id,
                    "agent_id": r.agent_id,
                    "agent_name": r.agent_name,
                    "stage": r.stage,
                    "role": r.role,
                    "department": r.department,
                    "status": r.status,
                    "start_time": r.start_time.isoformat() if r.start_time else None,
                    "finish_time": r.finish_time.isoformat()
                    if r.finish_time
                    else None,
                    "runtime_ms": r.runtime_ms,
                    "provider": r.provider,
                    "model": r.model,
                    "temperature": r.temperature,
                    "max_tokens": r.max_tokens,
                    "prompt_tokens": r.prompt_tokens,
                    "completion_tokens": r.completion_tokens,
                    "total_tokens": r.total_tokens,
                    "input_cost": r.input_cost,
                    "output_cost": r.output_cost,
                    "total_cost": r.total_cost,
                    "retries": r.retries,
                    "error": r.error,
                    "tool_calls": r.tool_calls,
                    "reasoning_summary": r.reasoning_summary,
                    "decision_summary": r.decision_summary,
                    "artifacts_produced": r.artifacts_produced,
                    "confidence": r.confidence,
                }
                for r in records
            ],
            "total": len(records),
        }

    async def get_telemetry_summary(self, objective_id: str) -> dict[str, Any]:
        records = await self._telemetry_repo.list_by_objective(objective_id)
        total_agents = len(records)
        completed = sum(1 for r in records if r.status == "completed")
        failed = sum(1 for r in records if r.status == "failed")
        total_cost_val = sum(r.total_cost or 0.0 for r in records)
        total_tokens_val = sum(r.total_tokens or 0 for r in records)
        total_runtime = sum(r.runtime_ms or 0.0 for r in records)

        by_stage: dict[str, int] = {}
        for r in records:
            by_stage[r.stage] = by_stage.get(r.stage, 0) + 1

        return {
            "total_agents": total_agents,
            "completed": completed,
            "failed": failed,
            "total_cost": round(total_cost_val, 6),
            "total_tokens": total_tokens_val,
            "total_runtime_ms": round(total_runtime, 2),
            "by_stage": by_stage,
        }

    # ── Snapshots ─────────────────────────────────────────────────────────

    async def save_snapshot(
        self,
        objective_id: str,
        snapshot_data: dict[str, Any],
        *,
        snapshot_version: int = 1,
    ) -> dict[str, Any]:
        existing = await self._snapshot_repo.get_by_objective(objective_id)
        if existing:
            updated = await self._snapshot_repo.update(
                existing.id,
                {
                    "snapshot_data": snapshot_data,
                    "snapshot_version": snapshot_version,
                    "updated_at": datetime.now(UTC),
                },
            )
            await self._session.commit()
            if updated:
                return {"id": updated.id, "version": updated.snapshot_version}
            return {"error": "update failed"}
        snapshot = ExecutionSnapshot(
            objective_id=objective_id,
            snapshot_data=snapshot_data,
            snapshot_version=snapshot_version,
        )
        created = await self._snapshot_repo.create(snapshot)
        await self._session.commit()
        return {"id": created.id, "version": created.snapshot_version}

    async def get_snapshot(self, objective_id: str) -> dict[str, Any] | None:
        snapshot = await self._snapshot_repo.get_by_objective(objective_id)
        if not snapshot:
            return None
        return {
            "id": snapshot.id,
            "objective_id": snapshot.objective_id,
            "snapshot_data": snapshot.snapshot_data,
            "snapshot_version": snapshot.snapshot_version,
            "created_at": snapshot.created_at.isoformat()
            if snapshot.created_at
            else None,
            "updated_at": snapshot.updated_at.isoformat()
            if snapshot.updated_at
            else None,
        }

