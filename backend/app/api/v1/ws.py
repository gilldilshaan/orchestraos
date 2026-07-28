from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.kernel import ai_kernel

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, objective_id: str, ws: WebSocket) -> None:
        await ws.accept()
        if objective_id not in self._connections:
            self._connections[objective_id] = []
        self._connections[objective_id].append(ws)

    def disconnect(self, objective_id: str, ws: WebSocket) -> None:
        if objective_id in self._connections:
            self._connections[objective_id] = [
                c for c in self._connections[objective_id] if c is not ws
            ]
            if not self._connections[objective_id]:
                del self._connections[objective_id]

    async def broadcast(self, objective_id: str, message: dict[str, Any]) -> None:
        if objective_id not in self._connections:
            return
        disconnected: list[WebSocket] = []
        for ws in self._connections[objective_id]:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(objective_id, ws)

    async def broadcast_all(self, message: dict[str, Any]) -> None:
        for objective_id in list(self._connections.keys()):
            await self.broadcast(objective_id, message)


manager = ConnectionManager()


@router.websocket("/ws/{objective_id}")
async def dashboard_websocket(objective_id: str, ws: WebSocket) -> None:
    await manager.connect(objective_id, ws)
    try:
        # Send initial connection confirmation
        await ws.send_json({
            "type": "connected",
            "objective_id": objective_id,
            "data": {"status": "live_updates_active"},
        })

        # Listen for subscription preferences
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")

                if msg_type == "ping":
                    await ws.send_json({"type": "pong"})
                elif msg_type == "subscribe":
                    await ws.send_json({
                        "type": "subscribed",
                        "channels": msg.get("channels", ["all"]),
                    })
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect(objective_id, ws)


async def broadcast_dashboard_update(objective_id: str, data: dict[str, Any]) -> None:
    await manager.broadcast(objective_id, {
        "type": "dashboard_update",
        "objective_id": objective_id,
        "data": data,
        "timestamp": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).isoformat(),
    })


# Register event bus listeners for real-time WebSocket pushes
async def _setup_event_listeners() -> None:
    async def _on_state_changed(objective_id: str, data: dict[str, Any], **kwargs: Any) -> None:
        await broadcast_dashboard_update(objective_id, {
            "event": "state_changed",
            "payload": data,
        })

    async def _on_step_completed(objective_id: str, data: dict[str, Any], **kwargs: Any) -> None:
        await broadcast_dashboard_update(objective_id, {
            "event": "step_completed",
            "payload": data,
        })

    ai_kernel.event_bus.subscribe("objective.state_changed", _on_state_changed)
    for step in ["compiler", "planner", "organization", "risk", "decision", "devils_advocate"]:
        ai_kernel.event_bus.subscribe(f"{step}.completed", _on_step_completed)
        ai_kernel.event_bus.subscribe(f"{step}.failed", _on_step_completed)
