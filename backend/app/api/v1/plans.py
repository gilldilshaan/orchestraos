from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("/{plan_id}")
async def get_plan(plan_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}


@router.post("/{plan_id}/approve")
async def approve_plan(plan_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}
