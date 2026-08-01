from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session_factory

pytest_plugins = []


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "integration: mark test as requiring a real PostgreSQL database",
    )


@pytest_asyncio.fixture(autouse=True)
async def _ensure_schema(request):
    """Create tables so integration tests can run against a fresh database."""
    if request.node.get_closest_marker("integration"):
        from app.database.base import Base
        from app.database.session import engine

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as s:
        yield s
        await s.rollback()
        await s.close()
