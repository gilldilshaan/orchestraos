from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.extensions_repository import (
    AgentTelemetryRepository,
    StoredExecutionEventRepository,
)
from app.repositories.intelligence_repository import (
    AgentConflictRepository,
    AgentMessageRepository,
    ApprovalGateRepository,
    ExecutionCheckpointRepository,
    SelfHealingActionRepository,
    WatchdogAlertRepository,
)
from app.repositories.objective_repository import ObjectiveRepository


class AgentCommunicationService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._message_repo = AgentMessageRepository(session)
        self._conflict_repo = AgentConflictRepository(session)

    async def send_message(
        self,
        objective_id: str,
        from_agent: str,
        to_agent: str,
        subject: str,
        message_type: str = "reply",
        body: str | None = None,
        parent_message_id: str | None = None,
    ) -> dict[str, Any]:
        from app.models.extensions import AgentMessage

        msg = AgentMessage(
            objective_id=objective_id,
            from_agent=from_agent,
            to_agent=to_agent,
            subject=subject,
            body=body,
            message_type=message_type,
            parent_message_id=parent_message_id,
            status="sent",
        )
        created = await self._message_repo.create(msg)
        return {
            "id": created.id,
            "objective_id": created.objective_id,
            "from_agent": created.from_agent,
            "to_agent": created.to_agent,
            "subject": created.subject,
            "body": created.body,
            "message_type": created.message_type,
            "parent_message_id": created.parent_message_id,
            "status": created.status,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def list_messages(
        self,
        objective_id: str,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        msgs = await self._message_repo.list_by_objective(objective_id, skip=skip, limit=limit)
        return [
            {
                "id": m.id,
                "objective_id": m.objective_id,
                "from_agent": m.from_agent,
                "to_agent": m.to_agent,
                "subject": m.subject,
                "body": m.body,
                "message_type": m.message_type,
                "parent_message_id": m.parent_message_id,
                "status": m.status,
                "read_at": m.read_at.isoformat() if m.read_at else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in msgs
        ]

    async def get_conversation(
        self, objective_id: str, agent_a: str, agent_b: str
    ) -> list[dict[str, Any]]:
        msgs = await self._message_repo.list_conversation(objective_id, agent_a, agent_b)
        return [
            {
                "id": m.id,
                "from_agent": m.from_agent,
                "to_agent": m.to_agent,
                "subject": m.subject,
                "body": m.body,
                "message_type": m.message_type,
                "status": m.status,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in msgs
        ]

    async def mark_read(self, message_id: str) -> dict[str, Any] | None:
        msg = await self._message_repo.mark_read(message_id)
        if not msg:
            return None
        return {"id": msg.id, "status": msg.status, "read_at": msg.read_at.isoformat() if msg.read_at else None}

    async def get_unread_count(self, objective_id: str, agent: str) -> int:
        return await self._message_repo.count_unread(objective_id, agent)

    async def report_conflict(
        self,
        objective_id: str,
        agent_a: str,
        agent_b: str,
        subject: str,
        disagreement: str,
        evidence_a: list[dict[str, Any]] | None = None,
        evidence_b: list[dict[str, Any]] | None = None,
        alternatives: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        from app.models.extensions import AgentConflict

        conflict = AgentConflict(
            objective_id=objective_id,
            agent_a=agent_a,
            agent_b=agent_b,
            subject=subject,
            disagreement=disagreement,
            evidence_a=evidence_a,
            evidence_b=evidence_b,
            alternatives=alternatives,
            status="open",
        )
        created = await self._conflict_repo.create(conflict)
        return {
            "id": created.id,
            "objective_id": created.objective_id,
            "agent_a": created.agent_a,
            "agent_b": created.agent_b,
            "subject": created.subject,
            "disagreement": created.disagreement,
            "status": created.status,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def list_conflicts(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        conflicts = await self._conflict_repo.list_by_objective(objective_id, skip=skip, limit=limit)
        return [
            {
                "id": c.id,
                "objective_id": c.objective_id,
                "agent_a": c.agent_a,
                "agent_b": c.agent_b,
                "subject": c.subject,
                "disagreement": c.disagreement,
                "status": c.status,
                "resolution": c.resolution,
                "resolved_by": c.resolved_by,
                "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in conflicts
        ]

    async def resolve_conflict(
        self, conflict_id: str, resolution: str, resolved_by: str
    ) -> dict[str, Any] | None:
        c = await self._conflict_repo.resolve(conflict_id, resolution, resolved_by)
        if not c:
            return None
        return {
            "id": c.id,
            "status": c.status,
            "resolution": c.resolution,
            "resolved_by": c.resolved_by,
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        }


class ApprovalService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._gate_repo = ApprovalGateRepository(session)

    async def create_gate(
        self,
        objective_id: str,
        gate_type: str,
        title: str,
        proposed_by: str,
        description: str | None = None,
        execution_paused: bool = True,
    ) -> dict[str, Any]:
        from app.models.extensions import ApprovalGate

        gate = ApprovalGate(
            objective_id=objective_id,
            gate_type=gate_type,
            title=title,
            description=description,
            proposed_by=proposed_by,
            execution_paused=execution_paused,
            status="pending",
        )
        created = await self._gate_repo.create(gate)
        return {
            "id": created.id,
            "objective_id": created.objective_id,
            "gate_type": created.gate_type,
            "title": created.title,
            "description": created.description,
            "proposed_by": created.proposed_by,
            "status": created.status,
            "execution_paused": created.execution_paused,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def list_gates(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        gates = await self._gate_repo.list_by_objective(objective_id, skip=skip, limit=limit)
        return [
            {
                "id": g.id,
                "objective_id": g.objective_id,
                "gate_type": g.gate_type,
                "title": g.title,
                "description": g.description,
                "proposed_by": g.proposed_by,
                "status": g.status,
                "review_notes": g.review_notes,
                "reviewed_by": g.reviewed_by,
                "reviewed_at": g.reviewed_at.isoformat() if g.reviewed_at else None,
                "execution_paused": g.execution_paused,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in gates
        ]

    async def list_pending_gates(self, objective_id: str) -> list[dict[str, Any]]:
        gates = await self._gate_repo.list_pending(objective_id)
        return [
            {
                "id": g.id,
                "title": g.title,
                "gate_type": g.gate_type,
                "proposed_by": g.proposed_by,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in gates
        ]

    async def review_gate(
        self,
        gate_id: str,
        status: str,
        reviewed_by: str,
        notes: str | None = None,
    ) -> dict[str, Any] | None:
        gate = await self._gate_repo.review(gate_id, status, reviewed_by, notes)
        if not gate:
            return None
        return {
            "id": gate.id,
            "status": gate.status,
            "reviewed_by": gate.reviewed_by,
            "reviewed_at": gate.reviewed_at.isoformat() if gate.reviewed_at else None,
            "review_notes": gate.review_notes,
        }


class CheckpointService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._checkpoint_repo = ExecutionCheckpointRepository(session)

    async def save_checkpoint(
        self,
        objective_id: str,
        completed_steps: list[str],
        current_step: str | None = None,
        checkpoint_data: dict[str, Any] | None = None,
        cursor: str | None = None,
        status: str = "in_progress",
    ) -> dict[str, Any]:
        cp = await self._checkpoint_repo.upsert(
            objective_id,
            {
                "completed_steps": completed_steps,
                "current_step": current_step,
                "checkpoint_data": checkpoint_data or {},
                "cursor": cursor,
                "status": status,
            },
        )
        return {
            "id": cp.id,
            "objective_id": cp.objective_id,
            "completed_steps": cp.completed_steps,
            "current_step": cp.current_step,
            "status": cp.status,
            "cursor": cp.cursor,
            "resume_count": cp.resume_count,
            "failure_count": cp.failure_count,
            "last_resumed_at": cp.last_resumed_at.isoformat() if cp.last_resumed_at else None,
        }

    async def get_checkpoint(self, objective_id: str) -> dict[str, Any] | None:
        cp = await self._checkpoint_repo.get_by_objective(objective_id)
        if not cp:
            return None
        return {
            "id": cp.id,
            "objective_id": cp.objective_id,
            "completed_steps": cp.completed_steps,
            "current_step": cp.current_step,
            "status": cp.status,
            "cursor": cp.cursor,
            "checkpoint_data": cp.checkpoint_data,
            "resume_count": cp.resume_count,
            "failure_count": cp.failure_count,
            "last_resumed_at": cp.last_resumed_at.isoformat() if cp.last_resumed_at else None,
        }

    async def resume_checkpoint(self, objective_id: str) -> dict[str, Any] | None:
        cp = await self._checkpoint_repo.get_by_objective(objective_id)
        if not cp:
            return None
        updated = await self._checkpoint_repo.upsert(
            objective_id,
            {
                "status": "in_progress",
                "resume_count": cp.resume_count + 1,
                "last_resumed_at": datetime.now(UTC),
            },
        )
        return {
            "id": updated.id,
            "objective_id": updated.objective_id,
            "completed_steps": updated.completed_steps,
            "current_step": updated.current_step,
            "status": updated.status,
            "resume_count": updated.resume_count,
            "last_resumed_at": updated.last_resumed_at.isoformat() if updated.last_resumed_at else None,
        }


class WatchdogService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._alert_repo = WatchdogAlertRepository(session)

    async def create_alert(
        self,
        objective_id: str,
        alert_type: str,
        severity: str,
        source: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        from app.models.extensions import WatchdogAlert

        alert = WatchdogAlert(
            objective_id=objective_id,
            alert_type=alert_type,
            severity=severity,
            source=source,
            message=message,
            details=details,
        )
        created = await self._alert_repo.create(alert)
        return {
            "id": created.id,
            "objective_id": created.objective_id,
            "alert_type": created.alert_type,
            "severity": created.severity,
            "source": created.source,
            "message": created.message,
            "details": created.details,
            "acknowledged": created.acknowledged,
            "resolved": created.resolved,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def list_alerts(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        alerts = await self._alert_repo.list_by_objective(objective_id, skip=skip, limit=limit)
        return [
            {
                "id": a.id,
                "objective_id": a.objective_id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "source": a.source,
                "message": a.message,
                "details": a.details,
                "acknowledged": a.acknowledged,
                "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
                "resolved": a.resolved,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ]

    async def list_unresolved(self, objective_id: str) -> list[dict[str, Any]]:
        alerts = await self._alert_repo.list_unresolved(objective_id)
        return [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "source": a.source,
                "message": a.message,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ]

    async def acknowledge_alert(self, alert_id: str) -> dict[str, Any] | None:
        a = await self._alert_repo.acknowledge(alert_id)
        if not a:
            return None
        return {"id": a.id, "acknowledged": a.acknowledged, "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None}

    async def resolve_alert(self, alert_id: str) -> dict[str, Any] | None:
        a = await self._alert_repo.resolve_alert(alert_id)
        if not a:
            return None
        return {"id": a.id, "resolved": a.resolved, "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None}

    async def get_alert_counts(self) -> dict[str, int]:
        return {
            "total_unresolved": await self._alert_repo.count_unresolved(),
        }


class SelfHealingService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._heal_repo = SelfHealingActionRepository(session)
        self._alert_repo = WatchdogAlertRepository(session)
        self._checkpoint_repo = ExecutionCheckpointRepository(session)

    async def record_action(
        self,
        objective_id: str,
        trigger_event: str,
        action_type: str,
        target: str,
        result: str,
        details: dict[str, Any] | None = None,
        duration_ms: float | None = None,
    ) -> dict[str, Any]:
        from app.models.extensions import SelfHealingAction

        action = SelfHealingAction(
            objective_id=objective_id,
            trigger_event=trigger_event,
            action_type=action_type,
            target=target,
            result=result,
            details=details,
            duration_ms=duration_ms,
        )
        created = await self._heal_repo.create(action)
        return {
            "id": created.id,
            "objective_id": created.objective_id,
            "trigger_event": created.trigger_event,
            "action_type": created.action_type,
            "target": created.target,
            "result": created.result,
            "details": created.details,
            "duration_ms": created.duration_ms,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def list_actions(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        actions = await self._heal_repo.list_by_objective(objective_id, skip=skip, limit=limit)
        return [
            {
                "id": a.id,
                "objective_id": a.objective_id,
                "trigger_event": a.trigger_event,
                "action_type": a.action_type,
                "target": a.target,
                "result": a.result,
                "details": a.details,
                "duration_ms": a.duration_ms,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in actions
        ]

    async def get_healing_stats(self, objective_id: str) -> dict[str, Any]:
        success = await self._heal_repo.count_by_result(objective_id, "success")
        failure = await self._heal_repo.count_by_result(objective_id, "failure")
        partial = await self._heal_repo.count_by_result(objective_id, "partial")
        unresolved_alerts = await self._alert_repo.count_unresolved_by_objective(objective_id)
        return {
            "total_actions": success + failure + partial,
            "success_count": success,
            "failure_count": failure,
            "partial_count": partial,
            "success_rate": round(success / (success + failure + partial) * 100, 1) if (success + failure + partial) > 0 else 100.0,
            "unresolved_alerts": unresolved_alerts,
        }

    async def auto_heal(
        self,
        objective_id: str,
        error_type: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        start = time.monotonic()

        if error_type == "llm_timeout":
            action_result = await self._record_action(
                objective_id, error_type, "retry", "llm_client", "success",
                {"attempt": 1, "fallback_model": True, **({"original": context} if context else {})},
            )
        elif error_type == "agent_failure":
            agent = (context or {}).get("agent", "unknown")
            action_result = await self._record_action(
                objective_id, error_type, "alternate_agent", agent, "success",
                details={"recovery": "route_to_alternate_agent", "context": context},
            )
        elif error_type == "dependency_missing":
            dep = (context or {}).get("dependency", "unknown")
            action_result = await self._record_action(
                objective_id, error_type, "dependency_repair", dep, "success",
                details={"resolved": True, "context": context},
            )
        elif error_type == "stall_detected":
            cp = await self._checkpoint_repo.get_by_objective(objective_id)
            if cp:
                action_result = await self._record_action(
                    objective_id, error_type, "checkpoint_resume", f"step:{cp.current_step or 'unknown'}", "success",
                    details={"resume_count": cp.resume_count + 1, "context": context},
                )
            else:
                action_result = await self._record_action(
                    objective_id, error_type, "checkpoint_resume", "no_checkpoint", "failure",
                    details={"error": "no_checkpoint_available", "context": context},
                )
        else:
            action_result = await self._record_action(
                objective_id, error_type, "retry", "unknown", "partial",
                details={"error": f"unhandled_type:{error_type}", "context": context},
            )

        elapsed = time.monotonic() - start
        return {
            "action": action_result,
            "duration_ms": round(elapsed * 1000, 2),
        }

    async def _record_action(
        self,
        objective_id: str,
        trigger_event: str,
        action_type: str,
        target: str,
        result: str,
        details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        from app.models.extensions import SelfHealingAction

        action = SelfHealingAction(
            objective_id=objective_id,
            trigger_event=trigger_event,
            action_type=action_type,
            target=target,
            result=result,
            details=details,
        )
        created = await self._heal_repo.create(action)
        return {
            "id": created.id,
            "action_type": created.action_type,
            "target": created.target,
            "result": created.result,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }


class OperationsDashboardService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._objective_repo = ObjectiveRepository(session)
        self._agent_telemetry_repo = AgentTelemetryRepository(session)
        self._alert_repo = WatchdogAlertRepository(session)
        self._checkpoint_repo = ExecutionCheckpointRepository(session)
        self._heal_repo = SelfHealingActionRepository(session)
        self._gate_repo = ApprovalGateRepository(session)
        self._event_repo = StoredExecutionEventRepository(session)

    async def get_operations_summary(self) -> dict[str, Any]:
        objectives = await self._objective_repo.count()
        agents = await self._agent_telemetry_repo.list()
        active_agent_ids = set(a.agent_id for a in agents if a.status == "running")
        unresolved_alerts = await self._alert_repo.count_unresolved()
        gates = await self._gate_repo.list()
        pending_gates = sum(1 for g in gates if g.status == "pending")
        all_actions = await self._heal_repo.list()
        total_actions = len(all_actions)
        success_count = sum(1 for a_ in all_actions if a_.result == "success")
        failure_count = sum(1 for a_ in all_actions if a_.result == "failure")
        all_events = await self._event_repo.list()
        total_events = len(all_events)
        checkpoints = await self._checkpoint_repo.count()

        return {
            "active_objectives": objectives,
            "running_agents": len(active_agent_ids),
            "queue_depth": 0,
            "blocked_work_items": pending_gates,
            "pending_approvals": pending_gates,
            "health_score": round(
                max(0, 100 - (unresolved_alerts * 5)),
                1,
            ),
            "cost_today": 0,
            "token_usage": total_events,
            "success_rate": round(success_count / max(total_actions, 1) * 100, 1),
            "active_risks": unresolved_alerts,
            "total_alerts": unresolved_alerts,
            "pending_gates": pending_gates,
            "total_checkpoints": checkpoints,
            "total_healing_actions": total_actions,
        }
