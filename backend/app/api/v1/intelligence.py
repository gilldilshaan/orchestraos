from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.schemas import ApiResponse
from app.services.execution_intelligence import (
    AgentCommunicationService,
    ApprovalService,
    CheckpointService,
    OperationsDashboardService,
    SelfHealingService,
    WatchdogService,
)

router = APIRouter(prefix="/intelligence", tags=["execution-intelligence"])


# ─── Agent Communication ──────────────────────────────────────────────────────


@router.post("/messages")
async def send_message(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    result = await svc.send_message(
        objective_id=body["objective_id"],
        from_agent=body["from_agent"],
        to_agent=body["to_agent"],
        subject=body["subject"],
        message_type=body.get("message_type", "reply"),
        body=body.get("body"),
        parent_message_id=body.get("parent_message_id"),
    )
    return ApiResponse(data=result)


@router.get("/messages/{objective_id}")
async def list_messages(
    objective_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    result = await svc.list_messages(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.get("/messages/{objective_id}/conversation")
async def get_conversation(
    objective_id: str,
    agent_a: str = Query(...),
    agent_b: str = Query(...),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    result = await svc.get_conversation(objective_id, agent_a, agent_b)
    return ApiResponse(data=result)


@router.post("/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    result = await svc.mark_read(message_id)
    if result is None:
        return ApiResponse(data={"error": "Message not found"})
    return ApiResponse(data=result)


@router.get("/messages/{objective_id}/unread/{agent}")
async def get_unread_count(
    objective_id: str,
    agent: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    count = await svc.get_unread_count(objective_id, agent)
    return ApiResponse(data={"objective_id": objective_id, "agent": agent, "unread_count": count})


# ─── Agent Conflicts ──────────────────────────────────────────────────────────


@router.post("/conflicts")
async def report_conflict(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    result = await svc.report_conflict(
        objective_id=body["objective_id"],
        agent_a=body["agent_a"],
        agent_b=body["agent_b"],
        subject=body["subject"],
        disagreement=body["disagreement"],
        evidence_a=body.get("evidence_a"),
        evidence_b=body.get("evidence_b"),
        alternatives=body.get("alternatives"),
    )
    return ApiResponse(data=result)


@router.get("/conflicts/{objective_id}")
async def list_conflicts(
    objective_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    result = await svc.list_conflicts(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.post("/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: str,
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = AgentCommunicationService(session)
    result = await svc.resolve_conflict(
        conflict_id=conflict_id,
        resolution=body["resolution"],
        resolved_by=body.get("resolved_by", "human_reviewer"),
    )
    if result is None:
        return ApiResponse(data={"error": "Conflict not found"})
    return ApiResponse(data=result)


# ─── Approval Gates ────────────────────────────────────────────────────────────


@router.post("/gates")
async def create_gate(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ApprovalService(session)
    result = await svc.create_gate(
        objective_id=body["objective_id"],
        gate_type=body["gate_type"],
        title=body["title"],
        proposed_by=body["proposed_by"],
        description=body.get("description"),
        execution_paused=body.get("execution_paused", True),
    )
    return ApiResponse(data=result)


@router.get("/gates/{objective_id}")
async def list_gates(
    objective_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ApprovalService(session)
    result = await svc.list_gates(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.get("/gates/{objective_id}/pending")
async def list_pending_gates(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ApprovalService(session)
    result = await svc.list_pending_gates(objective_id)
    return ApiResponse(data=result)


@router.post("/gates/{gate_id}/review")
async def review_gate(
    gate_id: str,
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ApprovalService(session)
    result = await svc.review_gate(
        gate_id=gate_id,
        status=body["status"],
        reviewed_by=body.get("reviewed_by", "human_reviewer"),
        notes=body.get("notes"),
    )
    if result is None:
        return ApiResponse(data={"error": "Gate not found"})
    return ApiResponse(data=result)


# ─── Execution Checkpoints ────────────────────────────────────────────────────


@router.post("/checkpoints")
async def save_checkpoint(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = CheckpointService(session)
    result = await svc.save_checkpoint(
        objective_id=body["objective_id"],
        completed_steps=body.get("completed_steps", []),
        current_step=body.get("current_step"),
        checkpoint_data=body.get("checkpoint_data"),
        cursor=body.get("cursor"),
        status=body.get("status", "in_progress"),
    )
    return ApiResponse(data=result)


@router.get("/checkpoints/{objective_id}")
async def get_checkpoint(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = CheckpointService(session)
    result = await svc.get_checkpoint(objective_id)
    if result is None:
        return ApiResponse(data={"error": "No checkpoint found"})
    return ApiResponse(data=result)


@router.post("/checkpoints/{objective_id}/resume")
async def resume_checkpoint(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = CheckpointService(session)
    result = await svc.resume_checkpoint(objective_id)
    if result is None:
        return ApiResponse(data={"error": "No checkpoint to resume"})
    return ApiResponse(data=result)


# ─── Watchdog Alerts ──────────────────────────────────────────────────────────


@router.post("/alerts")
async def create_alert(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = WatchdogService(session)
    result = await svc.create_alert(
        objective_id=body["objective_id"],
        alert_type=body["alert_type"],
        severity=body.get("severity", "warning"),
        source=body["source"],
        message=body["message"],
        details=body.get("details"),
    )
    return ApiResponse(data=result)


@router.get("/alerts/counts")
async def get_alert_counts(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = WatchdogService(session)
    result = await svc.get_alert_counts()
    return ApiResponse(data=result)


@router.get("/alerts/{objective_id}")
async def list_alerts(
    objective_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = WatchdogService(session)
    result = await svc.list_alerts(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.get("/alerts/{objective_id}/unresolved")
async def list_unresolved_alerts(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = WatchdogService(session)
    result = await svc.list_unresolved(objective_id)
    return ApiResponse(data=result)


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = WatchdogService(session)
    result = await svc.acknowledge_alert(alert_id)
    if result is None:
        return ApiResponse(data={"error": "Alert not found"})
    return ApiResponse(data=result)


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = WatchdogService(session)
    result = await svc.resolve_alert(alert_id)
    if result is None:
        return ApiResponse(data={"error": "Alert not found"})
    return ApiResponse(data=result)


# ─── Self-Healing ──────────────────────────────────────────────────────────────


@router.post("/healing/actions")
async def record_action(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = SelfHealingService(session)
    result = await svc.record_action(
        objective_id=body["objective_id"],
        trigger_event=body["trigger_event"],
        action_type=body["action_type"],
        target=body["target"],
        result=body["result"],
        details=body.get("details"),
        duration_ms=body.get("duration_ms"),
    )
    return ApiResponse(data=result)


@router.get("/healing/actions/{objective_id}")
async def list_healing_actions(
    objective_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = SelfHealingService(session)
    result = await svc.list_actions(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.get("/healing/stats/{objective_id}")
async def get_healing_stats(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = SelfHealingService(session)
    result = await svc.get_healing_stats(objective_id)
    return ApiResponse(data=result)


@router.post("/healing/auto")
async def auto_heal(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = SelfHealingService(session)
    result = await svc.auto_heal(
        objective_id=body["objective_id"],
        error_type=body["error_type"],
        context=body.get("context"),
    )
    return ApiResponse(data=result)


# ─── Operations Dashboard ──────────────────────────────────────────────────────


@router.get("/operations/summary")
async def get_operations_summary(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = OperationsDashboardService(session)
    result = await svc.get_operations_summary()
    return ApiResponse(data=result)
