from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any


class CacheManager:
    """In-memory cache for LLM responses to avoid redundant calls.

    Caches are keyed by (task_type, prompt_hash) and support TTL-based
    expiration. In production this would delegate to Redis.
    """

    def __init__(self, default_ttl_seconds: int = 300) -> None:
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._default_ttl = default_ttl_seconds
        self._hits = 0
        self._misses = 0

    def _make_key(self, task_type: str, prompt: str, context_hash: str = "") -> str:
        raw = f"{task_type}:{prompt}:{context_hash}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def compute_context_hash(self, context: dict[str, Any]) -> str:
        serialized = json.dumps(context, sort_keys=True, default=str)
        return hashlib.md5(serialized.encode()).hexdigest()

    def get(self, task_type: str, prompt: str, context: dict[str, Any] | None = None) -> Any | None:
        context_hash = self.compute_context_hash(context or {})
        key = self._make_key(task_type, prompt, context_hash)
        entry = self._cache.get(key)

        if entry is None:
            self._misses += 1
            return None

        value, timestamp = entry
        age = (datetime.now(UTC) - timestamp).total_seconds()
        if age > self._default_ttl:
            del self._cache[key]
            self._misses += 1
            return None

        self._hits += 1
        return value

    def set(
        self,
        task_type: str,
        prompt: str,
        value: Any,
        context: dict[str, Any] | None = None,
        ttl_seconds: int | None = None,
    ) -> None:
        context_hash = self.compute_context_hash(context or {})
        key = self._make_key(task_type, prompt, context_hash)
        ttl = ttl_seconds or self._default_ttl
        expiry = datetime.now(UTC)
        self._cache[key] = (value, expiry)

    def invalidate(self, task_type: str) -> None:
        keys_to_delete = [k for k in self._cache if k.startswith(task_type)]
        for k in keys_to_delete:
            del self._cache[k]

    def clear(self) -> None:
        self._cache.clear()
        self._hits = 0
        self._misses = 0

    def stats(self) -> dict[str, Any]:
        total = self._hits + self._misses
        return {
            "cache_size": len(self._cache),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total, 4) if total > 0 else 0.0,
        }
