from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}")
async def get_job(job_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}
