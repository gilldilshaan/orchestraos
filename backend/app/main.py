from __future__ import annotations

import contextlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import process_info  # noqa: F401  (import records process start time)
from app.api.v1.router import router as api_router
from app.api.v1.ws import router as ws_router
from app.config import settings
from app.logging_ import configure_logging
from app.middleware import setup_exception_handlers, setup_middleware
from app.redis_client import redis_client


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    with contextlib.suppress(Exception):
        await redis_client.connect()
    yield
    with contextlib.suppress(Exception):
        await redis_client.disconnect()


app = FastAPI(
    title="OrchestraOS API",
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

setup_middleware(app)
setup_exception_handlers(app)

app.include_router(api_router)
app.include_router(ws_router)

# Register WebSocket event listeners on startup
@app.on_event("startup")
async def _init_ws_listeners() -> None:
    from app.api.v1.ws import _setup_event_listeners
    await _setup_event_listeners()


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "OrchestraOS API",
        "version": settings.api_version,
        "status": "running",
    }
