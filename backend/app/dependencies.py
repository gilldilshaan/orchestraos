from __future__ import annotations

from fastapi import Header, HTTPException

from app.redis_client import redis_client


async def get_trace_id(x_trace_id: str | None = Header(None)) -> str | None:
    return x_trace_id


async def verify_internal_key(x_internal_key: str = Header(...)) -> None:
    from app.config import settings

    expected_key = settings.secret_key
    if x_internal_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid internal API key")


async def get_redis_health() -> bool:
    return await redis_client.ping()
