from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
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
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.repositories.objective_repository import ObjectiveRepository

    obj_repo = ObjectiveRepository(session)
    objectives = await obj_repo.list(limit=50, order_by="created_at", descending=True)
    dashboards = []
    for obj in objectives:
        aggregator = DashboardAggregator(session)
        result = await aggregator.get_dashboard(obj.id)
        dashboards.append(result)

    return ApiResponse(data=dashboards)