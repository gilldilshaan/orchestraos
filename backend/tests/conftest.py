from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session_factory

pytest_plugins = []


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "integration: mark test as requiring a real PostgreSQL database",
    )


@pytest_asyncio.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as s:
        yield s
        await s.rollback()
        await s.close()
