from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from app.kernel.context_manager import ExecutionContext

EventHandler = Callable[..., Awaitable[None]]


class EventBus:
    """Simple publish/subscribe event bus for agent communication.

    Agents publish events (e.g. PlanCreated, RisksIdentified) and
    other agents or services subscribe to react accordingly.
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, list[EventHandler]] = {}
        self._history: list[dict[str, Any]] = []

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        if event_type in self._subscribers:
            self._subscribers[event_type] = [
                h for h in self._subscribers[event_type] if h is not handler
            ]

    async def publish(
        self,
        event_type: str,
        objective_id: str,
        data: dict[str, Any] | None = None,
        context: ExecutionContext | None = None,
    ) -> None:
        event = {
            "event_type": event_type,
            "objective_id": objective_id,
            "data": data or {},
            "timestamp": datetime.now(UTC).isoformat(),
        }
        self._history.append(event)

        handlers = self._subscribers.get(event_type, [])
        for handler in handlers:
            try:
                await handler(objective_id=objective_id, data=data, context=context)
            except Exception:
                pass  # Subscriber failures are non-blocking

    def get_history(
        self,
        objective_id: str | None = None,
        event_type: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        events = self._history
        if objective_id:
            events = [e for e in events if e["objective_id"] == objective_id]
        if event_type:
            events = [e for e in events if e["event_type"] == event_type]
        return events[-limit:]

    def clear(self) -> None:
        self._subscribers.clear()
        self._history.clear()
