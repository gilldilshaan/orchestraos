from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.repositories.job_repository import JobRepository
from app.schemas import ApiResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=ApiResponse)
async def get_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    repo = JobRepository(session)
    job = await repo.get(job_id)
    if not job:
        return ApiResponse(data=None, meta={"message": "Job not found"})
    return ApiResponse(data={
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "worker": job.worker,
        "result": job.result,
        "error": job.error,
        "user_id": job.user_id,
        "objective_id": job.objective_id,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    })