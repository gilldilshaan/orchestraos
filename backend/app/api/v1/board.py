from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.kernel import ai_kernel
from app.schemas import ApiResponse
from app.services.board_events import board_sse_manager
from app.services.board_service import DEFAULT_ROSTER, BoardService

router = APIRouter()


class StartBoardRequest(BaseModel):
    objective_id: str = Field(..., description="Objective to convene the board on")
    title: str | None = None
    roster: list[str] | None = Field(default=None, description="Override the executive roster")
    rounds: int = Field(default=3, ge=1, le=10, description="Deliberation rounds")


@router.post("/start")
async def start_board(
    payload: StartBoardRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BoardService(session, kernel=ai_kernel)
    try:
        board = await service.start_board(
            payload.objective_id,
            title=payload.title,
            roster=payload.roster,
            rounds=payload.rounds,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ApiResponse(data={"id": board.id, "status": board.status})


@router.get("")
async def list_boards(
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BoardService(session)
    boards = await service.list_sessions(skip=skip, limit=limit)
    return ApiResponse(data={"sessions": [_session_dict(b) for b in boards], "total": len(boards)})


@router.get("/{board_id}")
async def get_board(
    board_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BoardService(session)
    board = await service.get_session(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board session not found")
    message_count = await service.get_message_count(board_id)
    return ApiResponse(data={**_session_dict(board), "message_count": message_count})


@router.get("/{board_id}/messages")
async def list_messages(
    board_id: str,
    skip: int = 0,
    limit: int = 500,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BoardService(session)
    board = await service.get_session(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board session not found")
    messages = await service.list_messages(board_id, skip=skip, limit=limit)
    return ApiResponse(data={
        "messages": [_message_dict(m) for m in messages],
        "total": await service.get_message_count(board_id),
    })


@router.get("/{board_id}/events")
async def stream_board_events(board_id: str, request: Request) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        q = board_sse_manager.subscribe(board_id)
        try:
            initial_event = json.dumps({
                "timestamp": None,
                "type": "connected",
                "phase": "session",
                "status": "connected",
                "message": "Connected to board session stream",
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
            board_sse_manager.unsubscribe(board_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _status(s: str) -> str:
    return s.replace("_", " ").title()


def _session_dict(b: Any) -> dict[str, Any]:
    return {
        "id": b.id,
        "objective_id": b.objective_id,
        "title": b.title,
        "topic": b.topic,
        "status": b.status,
        "roster": b.roster or list(DEFAULT_ROSTER),
        "rounds": b.rounds,
        "brief": b.brief,
        "result": b.result,
        "error": b.error,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def _message_dict(m: Any) -> dict[str, Any]:
    return {
        "id": m.id,
        "board_session_id": m.board_session_id,
        "sender": m.sender,
        "recipient": m.recipient,
        "kind": m.kind,
        "round": m.round,
        "title": m.title,
        "content": m.content,
        "stance": m.stance,
        "confidence": m.confidence,
        "payload": m.payload,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


__all__ = ["_message_dict", "_session_dict", "router"]
