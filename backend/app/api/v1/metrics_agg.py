from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.schemas import ApiResponse
from app.services.runtime_metrics import RuntimeMetricsAggregator

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/aggregate", response_model=ApiResponse)
async def get_aggregate_metrics(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Aggregate runtime metrics across all completed executions."""
    aggregator = RuntimeMetricsAggregator(session)
    result = await aggregator.aggregate()
    return ApiResponse(data=result)


@router.get("/charts", response_model=ApiResponse)
async def get_chart_data(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Time-series chart data for runtime metrics."""
    aggregator = RuntimeMetricsAggregator(session)
    result = await aggregator.charts()
    return ApiResponse(data=result)
