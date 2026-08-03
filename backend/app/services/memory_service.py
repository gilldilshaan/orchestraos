from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory
from app.repositories.memory_repository import MemoryRepository


class MemoryService:
    """Service layer for organizational memory operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = MemoryRepository(session)

    # -------------------------------------------------------------------------
    # CRUD operations
    # -------------------------------------------------------------------------

    async def list_memories(
        self,
        objective_id: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Return list of memories, optionally filtered by objective_id."""
        memories = await self._repo.get_many(
            skip=skip,
            limit=limit,
            objective_id=objective_id,
        )
        return [self._to_dict(m) for m in memories]

    async def get_memory(self, memory_id: str) -> dict[str, Any] | None:
        memory = await self._repo.get(memory_id)
        return self._to_dict(memory) if memory else None

    async def create_memory(self, data: dict[str, Any]) -> dict[str, Any]:
        data.setdefault("history", [])
        data.setdefault("tags", [])
        memory = await self._repo.create(**data)
        return self._to_dict(memory)

    async def update_memory(self, memory_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
        memory = await self._repo.get(memory_id)
        if memory is None:
            return None

        # Record a version-history entry for the timeline / audit trail
        changes: dict[str, Any] = {}
        for key in ("content", "confidence", "tags", "embedding"):
            if key in data:
                changes[key] = data[key]
        history = list(memory.history or [])
        history.append({
            "action": "updated",
            "timestamp": datetime.now(UTC).isoformat(),
            "changes": changes,
            "actor": data.pop("actor", "api"),
        })
        data["history"] = history

        updated = await self._repo.update(memory_id, **data)
        return self._to_dict(updated) if updated else None

    async def record_event(self, memory_id: str, action: str, details: dict[str, Any]) -> None:
        """Append a lifecycle event (retrieved / reused) to a memory's history.

        Used to power the knowledge timeline. Best-effort; failures are logged
        but never propagated so analytics/planning never break on write issues.
        """
        try:
            memory = await self._repo.get(memory_id)
            if memory is None:
                return
            history = list(memory.history or [])
            history.append({
                "action": action,
                "timestamp": datetime.now(UTC).isoformat(),
                "changes": details,
                "actor": details.get("actor", "system"),
            })
            metadata = dict(memory.metadata_ or {})
            usage_count = int(metadata.get("usage_count", 0)) + 1
            metadata["usage_count"] = usage_count
            metadata["last_retrieved_at"] = datetime.now(UTC).isoformat()
            await self._repo.update(memory_id, history=history, metadata=metadata)
        except Exception:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("[MemoryService] Failed to record event %s on %s", action, memory_id)

    # -------------------------------------------------------------------------
    # Vector similarity & knowledge extraction
    # -------------------------------------------------------------------------

    async def search_similar(
        self,
        embedding: list[float],
        objective_id: str | None = None,
        limit: int = 10,
        threshold: float = 0.75,
    ) -> list[dict[str, Any]]:
        """Return memories whose embedding cosine similarity >= threshold.

        Each returned memory dict carries a ``_similarity_score`` field (cosine
        similarity to the query embedding). Consumers that do not want the
        internal field should delete it after reading.
        """
        stmt = select(Memory).where(Memory.embedding.is_not(None))
        if objective_id:
            stmt = stmt.where(Memory.objective_id == objective_id)
        memories = (await self._session.execute(stmt)).scalars().all()

        def cosine(a: list[float], b: list[float]) -> float:
            if not a or not b or len(a) != len(b):
                return 0.0
            dot = sum(x * y for x, y in zip(a, b, strict=False))
            norm_a = sum(x * x for x in a) ** 0.5
            norm_b = sum(y * y for y in b) ** 0.5
            return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0

        scored = [(m, cosine(embedding, m.embedding or [])) for m in memories]
        scored.sort(key=lambda x: x[1], reverse=True)
        result = []
        for m, score in scored[:limit]:
            if score < threshold:
                break
            item = self._to_dict(m)
            item["_similarity_score"] = round(score, 4)
            result.append(item)
        return result

    async def extract_lessons(
        self,
        objective_id: str,
        min_confidence: float = 0.7,
    ) -> list[dict[str, Any]]:
        """Return high-confidence memories tagged as lessons."""
        stmt = select(Memory).where(
            Memory.objective_id == objective_id,
            Memory.confidence >= min_confidence,
            Memory.tags.op("@>")(["lesson"]),
        )
        memories = (await self._session.execute(stmt)).scalars().all()
        return [self._to_dict(m) for m in memories]

    async def extract_strategies(
        self,
        objective_id: str,
        min_confidence: float = 0.7,
    ) -> list[dict[str, Any]]:
        """Return high-confidence memories tagged as strategies."""
        stmt = select(Memory).where(
            Memory.objective_id == objective_id,
            Memory.confidence >= min_confidence,
            Memory.tags.op("@>")(["strategy"]),
        )
        memories = (await self._session.execute(stmt)).scalars().all()
        return [self._to_dict(m) for m in memories]

    async def get_history(self, memory_id: str) -> list[dict[str, Any]]:
        """Return the version history for a memory entry."""
        memory = await self._repo.get(memory_id)
        return memory.history or [] if memory else []

    # -------------------------------------------------------------------------
    # Helper methods
    # -------------------------------------------------------------------------

    def _to_dict(self, memory: Memory) -> dict[str, Any]:
        return {
            "id": memory.id,
            "objective_id": memory.objective_id,
            "embedding": memory.embedding,
            "tags": memory.tags,
            "confidence": memory.confidence,
            "content": memory.content,
            "history": memory.history,
            "created_at": memory.created_at.isoformat() if memory.created_at else None,
            "updated_at": memory.updated_at.isoformat() if memory.updated_at else None,
            "deleted_at": memory.deleted_at.isoformat() if memory.deleted_at else None,
            "created_by": memory.created_by,
            "updated_by": memory.updated_by,
            "version": memory.version,
            "metadata": memory.metadata_,
        }
