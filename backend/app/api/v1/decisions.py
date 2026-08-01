from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.repositories.extensions_repository import (
    DecisionOptionRepository,
    DecisionRepository,
    ExplanationRepository,
)
from app.schemas import ApiResponse, DecisionApproveRequest, DecisionRejectRequest

router = APIRouter(prefix="/decisions", tags=["Decisions"])


@router.get("", response_model=ApiResponse)
async def list_decisions(
    status: str | None = None,
    objective_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    repo = DecisionRepository(session)
    if objective_id:
        decisions = await repo.list_by_objective(objective_id, skip=skip, limit=limit)
    elif status:
        decisions = await repo.list_by_status(status, skip=skip, limit=limit)
    else:
        decisions = await repo.list(skip=skip, limit=limit, order_by="created_at", descending=True)

    decision_ids = [d.id for d in decisions]
    options_by_decision: dict[str, list[dict[str, Any]]] = {}
    explanations_by_entity: dict[str, dict[str, Any]] = {}
    if decision_ids:
        opt_repo = DecisionOptionRepository(session)
        all_options = []
        for did in decision_ids:
            all_options.extend(await opt_repo.list_by_decision(did))
        for o in all_options:
            options_by_decision.setdefault(o.decision_id, []).append({
                "id": o.id,
                "name": o.name,
                "description": o.description,
                "pros": o.pros,
                "cons": o.cons,
                "risks": o.risks,
                "cost": o.cost,
                "confidence": o.confidence,
                "is_recommended": o.is_recommended,
            })
        expl_repo = ExplanationRepository(session)
        for did in decision_ids:
            expls = await expl_repo.list_by_entity("Decision", did)
            if expls:
                e = expls[0]
                explanations_by_entity[did] = {
                    "recommendation": e.recommendation,
                    "reasoning": e.reasoning,
                    "evidence": e.evidence,
                    "assumptions": e.assumptions,
                    "confidence": e.confidence,
                    "risk_level": e.risk_level,
                    "affected_departments": e.affected_departments,
                    "model_used": e.model_used,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }

    return ApiResponse(data=[
        {
            "id": d.id,
            "objective_id": d.objective_id,
            "title": d.title,
            "decision_type": d.decision_type,
            "recommendation": d.recommendation,
            "reasoning": d.reasoning,
            "evidence": d.evidence,
            "confidence": d.confidence,
            "risk_level": d.risk_level,
            "status": d.status,
            "review_notes": d.review_notes,
            "options": options_by_decision.get(d.id, []),
            "explanation": explanations_by_entity.get(d.id),
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in decisions
    ])


@router.get("/pending", response_model=ApiResponse)
async def list_pending_decisions(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    repo = DecisionRepository(session)
    decisions = await repo.list_pending(skip=skip, limit=limit)
    return ApiResponse(data=[
        {
            "id": d.id,
            "objective_id": d.objective_id,
            "title": d.title,
            "recommendation": d.recommendation,
            "reasoning": d.reasoning,
            "confidence": d.confidence,
            "risk_level": d.risk_level,
            "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in decisions
    ])


@router.get("/{decision_id}", response_model=ApiResponse)
async def get_decision(
    decision_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    repo = DecisionRepository(session)
    opt_repo = DecisionOptionRepository(session)
    decision = await repo.get(decision_id)
    if not decision:
        return ApiResponse(data=None, meta={"message": "Decision not found"})
    options = await opt_repo.list_by_decision(decision_id)
    return ApiResponse(data={
        "id": decision.id,
        "objective_id": decision.objective_id,
        "title": decision.title,
        "description": decision.description,
        "decision_type": decision.decision_type,
        "recommendation": decision.recommendation,
        "reasoning": decision.reasoning,
        "evidence": decision.evidence,
        "confidence": decision.confidence,
        "risk_level": decision.risk_level,
        "affected_departments": decision.affected_departments,
        "status": decision.status,
        "reviewed_by": decision.reviewed_by,
        "reviewed_at": decision.reviewed_at.isoformat() if decision.reviewed_at else None,
        "review_notes": decision.review_notes,
        "options": [
            {"id": o.id, "name": o.name, "description": o.description, "pros": o.pros,
             "cons": o.cons, "risks": o.risks, "cost": o.cost, "confidence": o.confidence,
             "is_recommended": o.is_recommended}
            for o in options
        ],
        "created_at": decision.created_at.isoformat() if decision.created_at else None,
        "updated_at": decision.updated_at.isoformat() if decision.updated_at else None,
    })


@router.post("/{decision_id}/approve", response_model=ApiResponse)
async def approve_decision(
    decision_id: str,
    body: DecisionApproveRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from datetime import UTC, datetime

    repo = DecisionRepository(session)
    decision = await repo.get(decision_id)
    if not decision:
        return ApiResponse(data=None, meta={"message": "Decision not found"})
    await repo.update(decision_id, {
        "status": "APPROVED",
        "reviewed_by": body.user_id,
        "reviewed_at": datetime.now(UTC),
        "review_notes": body.notes,
    })
    return ApiResponse(data={"id": decision_id, "status": "APPROVED"})


@router.post("/{decision_id}/reject", response_model=ApiResponse)
async def reject_decision(
    decision_id: str,
    body: DecisionRejectRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from datetime import UTC, datetime

    repo = DecisionRepository(session)
    decision = await repo.get(decision_id)
    if not decision:
        return ApiResponse(data=None, meta={"message": "Decision not found"})
    await repo.update(decision_id, {
        "status": "REJECTED",
        "reviewed_by": body.user_id,
        "reviewed_at": datetime.now(UTC),
        "review_notes": body.notes,
    })
    return ApiResponse(data={"id": decision_id, "status": "REJECTED"})


@router.post("/{decision_id}/review", response_model=ApiResponse)
async def review_decision(
    decision_id: str,
    body: DecisionApproveRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    repo = DecisionRepository(session)
    decision = await repo.get(decision_id)
    if not decision:
        return ApiResponse(data=None, meta={"message": "Decision not found"})
    await repo.update(decision_id, {"status": "UNDER_REVIEW", "review_notes": body.notes})
    return ApiResponse(data={"id": decision_id, "status": "UNDER_REVIEW"})
