from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.repositories.extensions_repository import (
    MilestoneRepository,
    PlanRepository,
    PlanVersionRepository,
)
from app.schemas import ApiResponse, PlanUpdateParams
from app.services.engine import AdaptiveReplanningService

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("/{plan_id}", response_model=ApiResponse)
async def get_plan(
    plan_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    plan_repo = PlanRepository(session)
    ms_repo = MilestoneRepository(session)
    version_repo = PlanVersionRepository(session)

    plan = await plan_repo.get(plan_id)
    if not plan:
        return ApiResponse(data=None, meta={"message": "Plan not found"})

    milestones = await ms_repo.list_by_plan(plan_id)
    versions = await version_repo.list_by_plan(plan_id)

    return ApiResponse(data={
        "id": plan.id,
        "objective_id": plan.objective_id,
        "name": plan.name,
        "description": plan.description,
        "status": plan.status,
        "plan_version": plan.plan_version,
        "roadmap": plan.roadmap,
        "timeline": plan.timeline,
        "total_cost": plan.total_cost,
        "confidence": plan.confidence,
        "milestones": [
            {"id": m.id, "name": m.name, "description": m.description, "status": m.status,
             "order": m.order, "due_date": m.due_date.isoformat() if m.due_date else None}
            for m in milestones
        ],
        "versions": [
            {"id": v.id, "version_number": v.version_number, "diff_summary": v.diff_summary,
             "changes": v.changes, "created_at": v.created_at.isoformat() if v.created_at else None}
            for v in versions
        ],
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    })


@router.post("/{plan_id}/approve", response_model=ApiResponse)
async def approve_plan(
    plan_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    plan_repo = PlanRepository(session)
    plan = await plan_repo.get(plan_id)
    if not plan:
        return ApiResponse(data=None, meta={"message": "Plan not found"})
    await plan_repo.update(plan_id, {"status": "active"})
    return ApiResponse(data={"id": plan_id, "status": "active"})


@router.post("/{plan_id}/replan", response_model=ApiResponse)
async def replan_plan(
    plan_id: str,
    body: PlanUpdateParams,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = AdaptiveReplanningService(session)
    changes = body.model_dump(exclude_none=True)
    if not changes:
        return ApiResponse(data=None, meta={"message": "No changes provided"})
    result = await service.replan(plan_id, changes)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{plan_id}/versions", response_model=ApiResponse)
async def list_plan_versions(
    plan_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    version_repo = PlanVersionRepository(session)
    versions = await version_repo.list_by_plan(plan_id)
    return ApiResponse(data=[
        {"id": v.id, "version_number": v.version_number, "diff_summary": v.diff_summary,
         "changes": v.changes, "created_at": v.created_at.isoformat() if v.created_at else None}
        for v in versions
    ])
