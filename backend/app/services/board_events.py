from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any


class BoardSSEManager:
    """Fan-out of board session events (message persisted, round progress,
    session completed) to SSE subscribers keyed by board session id."""

    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue[dict[str, Any]]]] = {}

    async def publish(self, board_id: str, event: dict[str, Any]) -> None:
        if board_id not in self._queues:
            return
        dead: list[asyncio.Queue[dict[str, Any]]] = []
        for q in self._queues[board_id]:
            try:
                await q.put(event)
            except Exception:
                dead.append(q)
        for q in dead:
            self.unsubscribe(board_id, q)

    def subscribe(self, board_id: str) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        if board_id not in self._queues:
            self._queues[board_id] = []
        self._queues[board_id].append(q)
        return q

    def unsubscribe(self, board_id: str, q: asyncio.Queue[dict[str, Any]]) -> None:
        if board_id in self._queues:
            self._queues[board_id] = [x for x in self._queues[board_id] if x is not q]
            if not self._queues[board_id]:
                del self._queues[board_id]

    async def emit_message(self, board_id: str, message: dict[str, Any]) -> None:
        await self.publish(board_id, {
            "timestamp": datetime.now(UTC).isoformat(),
            "type": "message",
            "message": message,
        })

    async def emit_phase(
        self,
        board_id: str,
        phase: str,
        status: str,
        message: str,
        progress: float,
    ) -> None:
        await self.publish(board_id, {
            "timestamp": datetime.now(UTC).isoformat(),
            "type": "phase",
            "phase": phase,
            "status": status,
            "message": message,
            "progress": progress,
        })


board_sse_manager = BoardSSEManager()
