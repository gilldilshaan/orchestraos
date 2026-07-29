from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from typing import Any

from app.kernel import ai_kernel


class SSEEventManager:
    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue]] = {}

    async def publish(self, objective_id: str, event: dict[str, Any]) -> None:
        if objective_id not in self._queues:
            return
        dead: list[asyncio.Queue] = []
        for q in self._queues[objective_id]:
            try:
                await q.put(event)
            except Exception:
                dead.append(q)
        for q in dead:
            self.unsubscribe(objective_id, q)

    def subscribe(self, objective_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        if objective_id not in self._queues:
            self._queues[objective_id] = []
        self._queues[objective_id].append(q)
        return q

    def unsubscribe(self, objective_id: str, q: asyncio.Queue) -> None:
        if objective_id in self._queues:
            self._queues[objective_id] = [x for x in self._queues[objective_id] if x is not q]
            if not self._queues[objective_id]:
                del self._queues[objective_id]

    async def emit_stage(
        self,
        objective_id: str,
        stage: str,
        status: str,
        message: str,
        progress: float = 0.0,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        event: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "stage": stage,
            "status": status,
            "message": message,
            "progress": progress,
        }
        if metadata:
            event["metadata"] = metadata
        await self.publish(objective_id, event)

    def get_event_history(self, objective_id: str) -> list[dict[str, Any]]:
        return ai_kernel.event_bus.get_history(objective_id=objective_id, limit=50)


sse_manager = SSEEventManager()
