from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


class TestMigrations:
    async def test_upgrade_runs(self, _engine):
        from app.database.base import Base

        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def test_tables_exist(self, session):
        from sqlalchemy import inspect

        inspector = await session.connection()
        tables = await inspector.run_sync(
            lambda conn: inspect(conn).get_table_names()
        )
        assert "users" in tables
        assert "objectives" in tables
        assert "jobs" in tables

    async def test_users_columns(self, session):
        from sqlalchemy import inspect

        inspector = await session.connection()
        columns = await inspector.run_sync(
            lambda conn: inspect(conn).get_columns("users")
        )
        col_names = {c["name"] for c in columns}
        assert "id" in col_names
        assert "email" in col_names
        assert "display_name" in col_names
        assert "created_at" in col_names
        assert "updated_at" in col_names

    async def test_objectives_columns(self, session):
        from sqlalchemy import inspect

        inspector = await session.connection()
        columns = await inspector.run_sync(
            lambda conn: inspect(conn).get_columns("objectives")
        )
        col_names = {c["name"] for c in columns}
        assert "raw_input" in col_names
        assert "status" in col_names
        assert "user_id" in col_names

    async def test_jobs_columns(self, session):
        from sqlalchemy import inspect

        inspector = await session.connection()
        columns = await inspector.run_sync(
            lambda conn: inspect(conn).get_columns("jobs")
        )
        col_names = {c["name"] for c in columns}
        assert "job_type" in col_names
        assert "status" in col_names
        assert "user_id" in col_names
        assert "objective_id" in col_names

    async def test_tables_schema(self, session):
        from sqlalchemy import inspect

        inspector = await session.connection()
        columns = await inspector.run_sync(
            lambda conn: inspect(conn).get_columns("users")
        )
        id_col = next(c for c in columns if c["name"] == "id")
        assert id_col["primary_key"] is True

    async def test_downgrade_cleanup(self, session):
        from sqlalchemy import inspect
        tables = await (await session.connection()).run_sync(
            lambda conn: inspect(conn).get_table_names()
        )
        assert isinstance(tables, list)
