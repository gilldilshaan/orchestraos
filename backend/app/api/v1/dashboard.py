from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.repositories.extensions_repository import DepartmentRepository, PlanRepository
from app.repositories.objective_repository import ObjectiveRepository
from app.schemas import ApiResponse
from app.services.engine import DashboardAggregator

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/{objective_id}", response_model=ApiResponse)
async def get_dashboard(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    aggregator = DashboardAggregator(session)
    result = await aggregator.get_dashboard(objective_id)
    return ApiResponse(data=result)


@router.get("", response_model=ApiResponse)
async def list_dashboards(
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    obj_repo = ObjectiveRepository(session)
    objectives = await obj_repo.list(limit=limit, order_by="created_at", descending=True)
    dashboards = []
    for obj in objectives:
        dashboards.append(
            await _lightweight_dashboard(
                session,
                obj.id,
                obj.raw_input[:200] if obj.raw_input else "",
                obj.status or "",
                obj.current_stage or "",
                obj.confidence,
                obj.created_at,
                obj.updated_at,
            )
        )
    return ApiResponse(data=dashboards)


async def _lightweight_dashboard(
    session: AsyncSession,
    objective_id: str,
    summary: str,
    status: str,
    current_stage: str,
    confidence: float | None,
    created_at: object,
    updated_at: object,
) -> dict[str, Any]:
    from app.kernel.state_machine import WorkflowStateMachine

    dept_repo = DepartmentRepository(session)
    plan_repo = PlanRepository(session)
    depts = await dept_repo.list_by_objective(objective_id)
    plans = await plan_repo.list_by_objective(objective_id)

    total_head_count = sum(d.head_count or 0 for d in depts)

    return {
        "objective": {
            "id": objective_id,
            "summary": summary,
            "status": status,
            "current_stage": current_stage,
            "confidence": confidence,
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
            "updated_at": updated_at.isoformat() if hasattr(updated_at, "isoformat") else updated_at,
            "progress_percent": WorkflowStateMachine.get_progress_percent(status) if status else 0,
        },
        "organization": {
            "departments": [
                {
                    "name": d.name,
                    "status": d.status,
                    "role_count": len(d.roles) if d.roles else 0,
                    "head_count": d.head_count or 0,
                }
                for d in depts
            ],
            "total_head_count": total_head_count,
            "health_score": 0.85 if depts else None,
        },
        "plan": {
            "id": plans[0].id if plans else None,
            "name": plans[0].name if plans else None,
            "status": plans[0].status if plans else None,
            "plan_version": plans[0].plan_version if plans else 0,
            "confidence": plans[0].confidence if plans else None,
        } if plans else None,
    }
