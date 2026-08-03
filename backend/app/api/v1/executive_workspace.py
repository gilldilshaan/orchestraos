from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.kernel import ai_kernel
from app.schemas import ApiResponse
from app.services.executive_workspace_service import (
    ExecutiveWorkspaceService,
    executive_ws_sse_manager,
)

router = APIRouter()


class EnsureWorkspaceRequest(BaseModel):
    objective_id: str
    executive_role: str


class CreateItemRequest(BaseModel):
    kind: str = Field(..., pattern="^(task|decision|note|approval|risk|insight)$")
    title: str
    content: str | None = None
    priority: str | None = None
    due_at: datetime | None = None
    source: dict[str, Any] | None = None


class UpdateItemRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    priority: str | None = None
    status: str | None = None
    due_at: datetime | None = None


class UpdateKpisRequest(BaseModel):
    kpis: dict[str, Any]


@router.post("/ensure")
async def ensure_workspace(
    payload: EnsureWorkspaceRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    ws = await service.ensure_workspace(payload.objective_id, payload.executive_role)
    return ApiResponse(data=_workspace_dict(ws))


@router.post("/ensure-all")
async def ensure_all_workspaces(
    objective_id: str = Query(...),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    workspaces = await service.ensure_all_workspaces(objective_id)
    return ApiResponse(data={"workspaces": [_workspace_dict(w) for w in workspaces]})


@router.get("/{objective_id}/{executive_role}")
async def get_workspace(
    objective_id: str,
    executive_role: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    ws = await service.get_workspace(objective_id, executive_role)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ApiResponse(data=_workspace_dict(ws))


@router.get("/{objective_id}")
async def list_workspaces(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    workspaces = await service.list_workspaces(objective_id)
    return ApiResponse(data={"workspaces": [_workspace_dict(w) for w in workspaces]})


# ── Items ────────────────────────────────────────────────────────────────

@router.post("/{objective_id}/{executive_role}/items")
async def create_item(
    objective_id: str,
    executive_role: str,
    payload: CreateItemRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    item = await service.create_item(
        objective_id,
        executive_role,
        payload.kind,
        payload.title,
        payload.content,
        payload.priority,
        payload.due_at,
        payload.source,
    )
    return ApiResponse(data=_item_dict(item))


@router.get("/{objective_id}/{executive_role}/items")
async def list_items(
    objective_id: str,
    executive_role: str,
    kind: str | None = Query(None),
    status: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    items = await service.list_items(
        objective_id, executive_role, kind=kind, status=status, skip=skip, limit=limit
    )
    total = await service.count_items(objective_id, executive_role, kind=kind, status=status)
    return ApiResponse(data={"items": [_item_dict(i) for i in items], "total": total})


@router.patch("/{objective_id}/{executive_role}/items/{item_id}")
async def update_item(
    _objective_id: str,
    _executive_role: str,
    item_id: str,
    payload: UpdateItemRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    item = await service.update_item(item_id, updates)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return ApiResponse(data=_item_dict(item))


# ── KPIs ────────────────────────────────────────────────────────────────

@router.get("/{objective_id}/{executive_role}/kpis")
async def get_kpis(
    objective_id: str,
    executive_role: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    kpis = await service.get_kpis(objective_id, executive_role)
    return ApiResponse(data=kpis)


@router.patch("/{objective_id}/{executive_role}/kpis")
async def update_kpis(
    objective_id: str,
    executive_role: str,
    payload: UpdateKpisRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    ws = await service.update_kpis(objective_id, executive_role, payload.kpis)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ApiResponse(data=_workspace_dict(ws))


# ── Summary ────────────────────────────────────────────────────────────

@router.get("/{objective_id}/{executive_role}/summary")
async def get_summary(
    objective_id: str,
    executive_role: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    summary = await service.get_workspace_summary(objective_id, executive_role)
    return ApiResponse(data=summary)


# ── Memory partition ───────────────────────────────────────────────────

@router.get("/{objective_id}/{executive_role}/memories")
async def list_memories(
    objective_id: str,
    executive_role: str,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ExecutiveWorkspaceService(session, kernel=ai_kernel)
    memories = await service.list_memories(
        objective_id, executive_role, skip=skip, limit=limit
    )
    return ApiResponse(data={"memories": [_memory_dict(m) for m in memories]})


# ── SSE ────────────────────────────────────────────────────────────────

@router.get("/{objective_id}/{executive_role}/events")
async def stream_workspace_events(
    objective_id: str,
    executive_role: str,
    request: Request,
) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        q = executive_ws_sse_manager.subscribe(objective_id, executive_role)
        try:
            initial_event = json.dumps({
                "timestamp": None,
                "type": "connected",
                "phase": "workspace",
                "status": "connected",
                "message": f"Connected to {executive_role} workspace stream",
                "progress": 0.0,
            })
            yield f"data: {initial_event}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            executive_ws_sse_manager.unsubscribe(objective_id, executive_role, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Helpers ────────────────────────────────────────────────────────────



def _workspace_dict(ws: Any) -> dict[str, Any]:
    return {
        "id": str(ws.id),
        "objective_id": ws.objective_id,
        "executive_role": ws.executive_role,
        "title": ws.title,
        "status": ws.status,
        "context": ws.context,
        "kpis": ws.kpis,
        "created_at": ws.created_at.isoformat() if ws.created_at else None,
        "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
    }


def _item_dict(item: Any) -> dict[str, Any]:
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


def _memory_dict(m: Any) -> dict[str, Any]:
    return {
        "id": str(m.id),
        "objective_id": m.objective_id,
        "executive_id": m.executive_id,
        "embedding": m.embedding,
        "tags": m.tags,
        "confidence": m.confidence,
        "content": m.content,
        "history": m.history,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }
