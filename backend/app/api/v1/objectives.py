from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/objectives", tags=["Objectives"])


@router.post("")
async def create_objective() -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}


@router.get("/{objective_id}")
async def get_objective(objective_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}


@router.post("/{objective_id}/generate")
async def generate_plan(objective_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}
