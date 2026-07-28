from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import router as api_router
from app.config import settings
from app.logging_ import configure_logging
from app.middleware import setup_exception_handlers, setup_middleware
from app.redis_client import redis_client


@asynccontextmanager
async def lifespan(app: FastAPI) -> None:
    configure_logging()
    try:
        await redis_client.connect()
    except Exception:
        pass
    yield
    try:
        await redis_client.disconnect()
    except Exception:
        pass


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


@app.get("/")
async def root() -> dict:
    return {
        "service": "OrchestraOS API",
        "version": settings.api_version,
        "status": "running",
    }
