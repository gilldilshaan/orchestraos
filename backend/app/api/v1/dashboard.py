from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/{objective_id}")
async def get_dashboard(objective_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}
