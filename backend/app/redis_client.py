from __future__ import annotations

from typing import cast

import redis.asyncio as aioredis

from app.config import settings


class RedisClient:
    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None

    async def connect(self) -> None:
        self._client = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        await self._client.ping()

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def ping(self) -> bool:
        try:
            if self._client:
                return await self._client.ping()
            return False
        except Exception:
            return False

    async def get(self, key: str) -> str | None:
        if self._client:
            return cast(str | None, await self._client.get(key))
        return None

    async def set(self, key: str, value: str, ttl: int = 300) -> None:
        if self._client:
            await self._client.set(key, value, ex=ttl)

    async def delete(self, key: str) -> None:
        if self._client:
            await self._client.delete(key)


redis_client = RedisClient()
