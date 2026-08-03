from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.executive_workspace import (
    ExecutiveWorkspace,
    ExecutiveWorkspaceItem,
)
from app.models.memory import Memory
from app.repositories.executive_workspace_repository import (
    ExecutiveWorkspaceItemRepository,
    ExecutiveWorkspaceRepository,
)
from app.repositories.memory_repository import MemoryRepository
from app.repositories.objective_repository import ObjectiveRepository


class ExecutiveWorkspaceSSEManager:
    """Per-executive SSE stream keyed by (objective_id, executive_role)."""

    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue[dict[str, Any]]]] = {}

    def _key(self, objective_id: str, executive_role: str) -> str:
        return f"{objective_id}:{executive_role}"

    async def publish(
        self, objective_id: str, executive_role: str, event: dict[str, Any]
    ) -> None:
        key = self._key(objective_id, executive_role)
        if key not in self._queues:
            return
        dead: list[asyncio.Queue[dict[str, Any]]] = []
        for q in self._queues[key]:
            try:
                await q.put(event)
            except Exception:
                dead.append(q)
        for q in dead:
            self.unsubscribe(objective_id, executive_role, q)

    def subscribe(
        self, objective_id: str, executive_role: str
    ) -> asyncio.Queue[dict[str, Any]]:
        key = self._key(objective_id, executive_role)
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        if key not in self._queues:
            self._queues[key] = []
        self._queues[key].append(q)
        return q

    def unsubscribe(
        self, objective_id: str, executive_role: str, q: asyncio.Queue[dict[str, Any]]
    ) -> None:
        key = self._key(objective_id, executive_role)
        if key in self._queues:
            self._queues[key] = [x for x in self._queues[key] if x is not q]
            if not self._queues[key]:
                del self._queues[key]

    async def emit_item(
        self,
        objective_id: str,
        executive_role: str,
        item: dict[str, Any],
    ) -> None:
        await self.publish(objective_id, executive_role, {
            "timestamp": datetime.now(UTC).isoformat(),
            "type": "item",
            "item": item,
        })

    async def emit_phase(
        self,
        objective_id: str,
        executive_role: str,
        phase: str,
        status: str,
        message: str,
        progress: float,
    ) -> None:
        await self.publish(objective_id, executive_role, {
            "timestamp": datetime.now(UTC).isoformat(),
            "type": "phase",
            "phase": phase,
            "status": status,
            "message": message,
            "progress": progress,
        })


executive_ws_sse_manager = ExecutiveWorkspaceSSEManager()


DEFAULT_ROSTER: list[str] = [
    "CEO",
    "Planner",
    "Engineering",
    "Finance",
    "Marketing",
    "Legal",
    "Risk",
    "Operations",
]

ROLE_KPI_DEFAULTS: dict[str, dict[str, Any]] = {
    "CEO": {
        "leadership_score": 0.0,
        "consensus_rate": 0.0,
        "decision_quality": 0.0,
        "confidence_avg": 0.0,
    },
    "Planner": {
        "plan_completeness": 0.0,
        "milestone_adherence": 0.0,
        "dependency_management": 0.0,
    },
    "Engineering": {
        "velocity": 0.0,
        "architecture_score": 0.0,
        "technical_debt_ratio": 0.0,
    },
    "Finance": {
        "budget_accuracy": 0.0,
        "forecast_accuracy": 0.0,
        "cost_savings": 0.0,
    },
    "Marketing": {
        "growth_rate": 0.0,
        "conversion_rate": 0.0,
        "cac": 0.0,
    },
    "Legal": {
        "compliance_score": 0.0,
        "risk_mitigation": 0.0,
        "contract_turnaround": 0.0,
    },
    "Risk": {
        "detection_rate": 0.0,
        "false_positive_rate": 0.0,
        "mitigation_coverage": 0.0,
    },
    "Operations": {
        "capacity_utilization": 0.0,
        "process_efficiency": 0.0,
        "incident_response_time": 0.0,
    },
}


class ExecutiveWorkspaceService:
    """Aggregates per-executive workspace data: memories, tasks, decisions, KPIs."""

    def __init__(
        self,
        session: AsyncSession,
        kernel: Any | None = None,
    ) -> None:
        self._session = session
        self._kernel = kernel or ai_kernel
        self._ws_repo = ExecutiveWorkspaceRepository(session)
        self._item_repo = ExecutiveWorkspaceItemRepository(session)
        self._memory_repo = MemoryRepository(session)
        self._objective_repo = ObjectiveRepository(session)

    # ── Workspace lifecycle ────────────────────────────────────────────────

    async def ensure_workspace(
        self, objective_id: str, executive_role: str
    ) -> ExecutiveWorkspace:
        """Get or create a workspace for an executive on an objective."""
        existing = await self._ws_repo.get_by_objective_and_role(
            objective_id, executive_role
        )
        if existing:
            return existing

        objective = await self._objective_repo.get(objective_id)
        raw = objective.raw_input if objective else objective_id

        workspace = ExecutiveWorkspace(
            objective_id=objective_id,
            executive_role=executive_role,
            title=f"{executive_role} Workspace — {raw[:60]}",
            status="active",
            context={
                "objective_raw": raw,
                "role": executive_role,
                "created_from": "auto",
            },
            kpis=ROLE_KPI_DEFAULTS.get(executive_role, {}),
        )
        created = await self._ws_repo.create(workspace)
        await self._session.commit()
        return created

    async def ensure_all_workspaces(self, objective_id: str) -> list[ExecutiveWorkspace]:
        """Create workspaces for all default roster members."""
        workspaces = []
        for role in DEFAULT_ROSTER:
            ws = await self.ensure_workspace(objective_id, role)
            workspaces.append(ws)
        return workspaces

    async def get_workspace(
        self, objective_id: str, executive_role: str
    ) -> ExecutiveWorkspace | None:
        return await self._ws_repo.get_by_objective_and_role(
            objective_id, executive_role
        )

    async def list_workspaces(self, objective_id: str) -> list[ExecutiveWorkspace]:
        return await self._ws_repo.list_by_objective(objective_id)

    # ── Memory partition (per-executive) ──────────────────────────────────

    async def add_memory(
        self,
        objective_id: str,
        executive_role: str,
        content: dict[str, Any],
        embedding: list[float] | None = None,
        tags: list[str] | None = None,
        confidence: float | None = None,
        history: list[dict[str, Any]] | None = None,
    ) -> Memory:
        """Add a memory entry tagged for a specific executive."""
        ws = await self.ensure_workspace(objective_id, executive_role)
        memory = Memory(
            objective_id=objective_id,
            executive_id=ws.id,
            embedding=embedding,
            tags=tags,
            confidence=confidence,
            content=content,
            history=history,
        )
        self._session.add(memory)
        await self._session.flush()
        await self._session.commit()
        return memory

    async def list_memories(
        self,
        objective_id: str,
        executive_role: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Memory]:
        repo = MemoryRepository(self._session)
        if executive_role:
            ws = await self.get_workspace(objective_id, executive_role)
            if not ws:
                return []
            return await repo.list_by_executive(ws.id, skip=skip, limit=limit)
        return await repo.list_by_objective(objective_id, skip=skip, limit=limit)

    # ── Workspace items (tasks, decisions, notes) ─────────────────────────

    ITEM_KINDS = ("task", "decision", "note", "approval", "risk", "insight")

    async def create_item(
        self,
        objective_id: str,
        executive_role: str,
        kind: str,
        title: str,
        content: str | None = None,
        priority: str | None = None,
        due_at: datetime | None = None,
        source: dict[str, Any] | None = None,
    ) -> ExecutiveWorkspaceItem:
        if kind not in self.ITEM_KINDS:
            raise ValueError(f"Invalid item kind: {kind}")

        ws = await self.ensure_workspace(objective_id, executive_role)
        item = ExecutiveWorkspaceItem(
            workspace_id=ws.id,
            kind=kind,
            title=title,
            content=content,
            priority=priority,
            status="open",
            due_at=due_at,
            source=source,
        )
        created = await self._item_repo.create(item)
        await self._session.commit()
        await executive_ws_sse_manager.emit_item(
            objective_id, executive_role, self._item_dict(created)
        )
        return created

    async def update_item(
        self,
        item_id: str,
        updates: dict[str, Any],
    ) -> ExecutiveWorkspaceItem | None:
        item = await self._item_repo.get(item_id)
        if not item:
            return None
        for key, value in updates.items():
            if hasattr(item, key):
                setattr(item, key, value)
        await self._session.commit()
        # Emit update via SSE (need workspace context)
        return item

    async def list_items(
        self,
        objective_id: str,
        executive_role: str,
        *,
        kind: str | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ExecutiveWorkspaceItem]:
        ws = await self.get_workspace(objective_id, executive_role)
        if not ws:
            return []
        return await self._item_repo.list_by_workspace(
            ws.id, kind=kind, status=status, skip=skip, limit=limit
        )

    async def count_items(
        self,
        objective_id: str,
        executive_role: str,
        kind: str | None = None,
        status: str | None = None,
    ) -> int:
        ws = await self.get_workspace(objective_id, executive_role)
        if not ws:
            return 0
        return await self._item_repo.count_by_workspace(ws.id, kind=kind, status=status)

    # ── KPIs & aggregation ────────────────────────────────────────────────

    async def get_kpis(self, objective_id: str, executive_role: str) -> dict[str, Any]:
        ws = await self.get_workspace(objective_id, executive_role)
        if not ws:
            return ROLE_KPI_DEFAULTS.get(executive_role, {})
        return ws.kpis or ROLE_KPI_DEFAULTS.get(executive_role, {})

    async def update_kpis(
        self, objective_id: str, executive_role: str, kpis: dict[str, Any]
    ) -> ExecutiveWorkspace | None:
        ws = await self.get_workspace(objective_id, executive_role)
        if not ws:
            return None
        ws.kpis = {**(ws.kpis or {}), **kpis}
        await self._session.commit()
        return ws

    async def get_workspace_summary(
        self, objective_id: str, executive_role: str
    ) -> dict[str, Any]:
        ws = await self.get_workspace(objective_id, executive_role)
        if not ws:
            return {"error": "workspace not found"}

        items = await self.list_items(objective_id, executive_role)
        kpis = await self.get_kpis(objective_id, executive_role)

        counts = {}
        for kind in self.ITEM_KINDS:
            counts[kind] = sum(1 for i in items if i.kind == kind)

        open_counts = {}
        for kind in self.ITEM_KINDS:
            open_counts[kind] = sum(
                1 for i in items if i.kind == kind and i.status == "open"
            )

        memories = await self.list_memories(objective_id, executive_role)

        return {
            "workspace": {
                "id": ws.id,
                "title": ws.title,
                "role": ws.executive_role,
                "status": ws.status,
            },
            "kpis": kpis,
            "items": {
                "total": len(items),
                "by_kind": counts,
                "open_by_kind": open_counts,
            },
            "memories": {"total": len(memories)},
            "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
        }

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _item_dict(item: ExecutiveWorkspaceItem) -> dict[str, Any]:
        return {
            "id": str(item.id),
            "workspace_id": str(item.workspace_id),
            "kind": item.kind,
            "title": item.title,
            "content": item.content,
            "priority": item.priority,
            "status": item.status,
            "due_at": item.due_at.isoformat() if item.due_at else None,
            "source": item.source,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        }
