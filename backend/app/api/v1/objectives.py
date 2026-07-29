from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.repositories.objective_repository import ObjectiveRepository
from app.schemas import (
    ApiResponse,
    ObjectiveCompileResponse,
    ObjectiveCompilationSchema,
    ObjectiveCreate,
    ObjectiveResponse,
    ObjectiveUpdate,
)
from app.services.execution_events import sse_manager
from app.services.objective_compiler import ObjectiveCompilerService

router = APIRouter(prefix="/objectives", tags=["Objectives"])


@router.post("", response_model=ApiResponse)
async def create_objective(
    body: ObjectiveCreate,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.models.objective import Objective

    repo = ObjectiveRepository(session)
    objective = Objective(raw_input=body.raw_input, user_id=body.user_id)
    objective = await repo.create(objective)
    return ApiResponse(data={"id": objective.id, "raw_input": objective.raw_input, "status": objective.status})


@router.get("", response_model=ApiResponse)
async def list_objectives(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    repo = ObjectiveRepository(session)
    if status:
        objectives = await repo.list_by_status(status, skip=skip, limit=limit)
    else:
        objectives = await repo.list(skip=skip, limit=limit, order_by="created_at", descending=True)
    return ApiResponse(data=[
        {"id": o.id, "raw_input": o.raw_input[:200], "status": o.status, "current_stage": o.current_stage,
         "created_at": o.created_at.isoformat() if o.created_at else None}
        for o in objectives
    ])


@router.get("/{objective_id}", response_model=ApiResponse)
async def get_objective(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.repositories.extensions_repository import ObjectiveCompilationRepository

    repo = ObjectiveRepository(session)
    comp_repo = ObjectiveCompilationRepository(session)
    objective = await repo.get(objective_id)
    if not objective:
        return ApiResponse(data=None, meta={"message": "Objective not found"})

    compilation_data = None
    compilation = await comp_repo.get_by_objective(objective_id)
    if compilation:
        compilation_data = ObjectiveCompilationSchema(
            mission=compilation.mission,
            vision=compilation.vision,
            business_type=compilation.business_type,
            industry=compilation.industry,
            stakeholders=compilation.stakeholders,
            constraints=compilation.constraints if hasattr(compilation, 'constraints') else None,
            kpis=compilation.kpis,
            timeline=compilation.timeline,
            budget=compilation.budget,
            dependencies=compilation.dependencies,
            assumptions=compilation.assumptions,
            risks=compilation.risks,
            success_metrics=compilation.success_metrics,
        )

    return ApiResponse(data=ObjectiveResponse(
        id=objective.id,
        raw_input=objective.raw_input,
        compiled_summary=objective.compiled_summary,
        structured_goal=objective.structured_goal,
        constraints=objective.constraints,
        success_criteria=objective.success_criteria,
        confidence=objective.confidence,
        status=objective.status,
        current_stage=objective.current_stage,
        user_id=objective.user_id,
        compilation=compilation_data,
        created_at=objective.created_at,
        updated_at=objective.updated_at,
    ).model_dump())


@router.patch("/{objective_id}", response_model=ApiResponse)
async def update_objective(
    objective_id: str,
    body: ObjectiveUpdate,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    repo = ObjectiveRepository(session)
    update_data = body.model_dump(exclude_none=True)
    objective = await repo.update(objective_id, update_data)
    if not objective:
        return ApiResponse(data=None, meta={"message": "Objective not found"})
    return ApiResponse(data={"id": objective.id, "status": objective.status})


@router.post("/{objective_id}/compile", response_model=ApiResponse)
async def compile_objective(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    compiler = ObjectiveCompilerService(session)
    result = await compiler.compile(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.post("/{objective_id}/generate", response_model=ApiResponse)
async def generate_full_pipeline(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    compiler = ObjectiveCompilerService(session)
    result = await compiler.run_full_pipeline(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/events")
async def stream_execution_events(objective_id: str, request: Request) -> StreamingResponse:
    async def event_generator() -> str:
        q = sse_manager.subscribe(objective_id)
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'timestamp': None, 'stage': 'pipeline', 'status': 'connected', 'message': 'Connected to execution stream', 'progress': 0.0})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            sse_manager.unsubscribe(objective_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )