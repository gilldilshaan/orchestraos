from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/decisions", tags=["Decisions"])


@router.get("")
async def list_decisions() -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}


@router.get("/{decision_id}")
async def get_decision(decision_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}


@router.post("/{decision_id}/approve")
async def approve_decision(decision_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}


@router.post("/{decision_id}/reject")
async def reject_decision(decision_id: str) -> dict:
    return {"data": None, "meta": {"message": "Not implemented"}}
