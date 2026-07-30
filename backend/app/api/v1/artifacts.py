from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.schemas import ApiResponse
from app.services.artifact_service import ArtifactService

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


# ─── Events ──────────────────────────────────────────────────────────────


@router.get("/{objective_id}/events")
async def list_events(
    objective_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.get_events(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.post("/{objective_id}/events")
async def create_event(
    objective_id: str,
    stage: str,
    status: str,
    message: str | None = None,
    progress: float = 0.0,
    event_order: int = 0,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.persist_event(
        objective_id, stage, status, message=message, progress=progress, event_order=event_order
    )
    return ApiResponse(data=result)


@router.delete("/{objective_id}/events")
async def clear_events(
    objective_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.clear_events(objective_id)
    return ApiResponse(data=result)


# ─── Telemetry ───────────────────────────────────────────────────────────


@router.get("/{objective_id}/telemetry")
async def list_telemetry(
    objective_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.get_telemetry(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.post("/{objective_id}/telemetry")
async def create_telemetry(
    objective_id: str,
    agent_id: str,
    stage: str,
    status: str,
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
    parent_agents: dict | None = None,
    child_agents: dict | None = None,
    upstream: list | None = None,
    downstream: list | None = None,
    tool_calls: list | None = None,
    reasoning_summary: str | None = None,
    decision_summary: str | None = None,
    artifacts_produced: list | None = None,
    confidence: float | None = None,
    output_metadata: dict | None = None,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.persist_telemetry(
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
    return ApiResponse(data=result)


@router.get("/{objective_id}/telemetry/summary")
async def telemetry_summary(
    objective_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.get_telemetry_summary(objective_id)
    return ApiResponse(data=result)


# ─── Snapshots ───────────────────────────────────────────────────────────


@router.get("/{objective_id}/snapshot")
async def get_snapshot(
    objective_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.get_snapshot(objective_id)
    return ApiResponse(data=result)


@router.post("/{objective_id}/snapshot")
async def save_snapshot(
    objective_id: str,
    snapshot_data: dict,
    snapshot_version: int = 1,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ApiResponse:
    svc = ArtifactService(session)
    result = await svc.save_snapshot(
        objective_id, snapshot_data, snapshot_version=snapshot_version
    )
    return ApiResponse(data=result)
