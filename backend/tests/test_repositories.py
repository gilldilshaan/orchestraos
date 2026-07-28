from __future__ import annotations

import pytest

from app.models.job import Job
from app.models.objective import Objective
from app.models.user import User
from app.repositories.job_repository import JobRepository
from app.repositories.objective_repository import ObjectiveRepository
from app.repositories.user_repository import UserRepository

pytestmark = pytest.mark.integration


class TestUserRepository:
    async def test_create_user(self, session):
        repo = UserRepository(session)
        user = User(display_name="Test", email="test@example.com")
        created = await repo.create(user)
        assert created.id is not None
        assert created.email == "test@example.com"

    async def test_get_user(self, session):
        repo = UserRepository(session)
        user = User(display_name="Test", email="get@example.com")
        created = await repo.create(user)
        fetched = await repo.get(created.id)
        assert fetched is not None
        assert fetched.id == created.id

    async def test_get_nonexistent(self, session):
        repo = UserRepository(session)
        result = await repo.get("00000000-0000-7000-0000-000000000000")
        assert result is None

    async def test_get_by_email(self, session):
        repo = UserRepository(session)
        user = User(display_name="Email Test", email="unique@example.com")
        await repo.create(user)
        fetched = await repo.get_by_email("unique@example.com")
        assert fetched is not None
        assert fetched.display_name == "Email Test"

    async def test_get_by_email_not_found(self, session):
        repo = UserRepository(session)
        result = await repo.get_by_email("nonexistent@example.com")
        assert result is None

    async def test_list(self, session):
        repo = UserRepository(session)
        for i in range(5):
            u = User(display_name=f"User {i}", email=f"user{i}@example.com")
            await repo.create(u)
        users = await repo.list()
        assert len(users) >= 5

    async def test_update_user(self, session):
        repo = UserRepository(session)
        user = User(display_name="Old Name", email="update@example.com")
        created = await repo.create(user)
        updated = await repo.update(created.id, {"display_name": "New Name"})
        assert updated is not None
        assert updated.display_name == "New Name"
        assert updated.version == 2

    async def test_soft_delete(self, session):
        repo = UserRepository(session)
        user = User(display_name="Delete Me", email="delete@example.com")
        created = await repo.create(user)
        deleted = await repo.soft_delete(created.id)
        assert deleted is True
        fetched = await repo.get(created.id)
        assert fetched is None

    async def test_count(self, session):
        repo = UserRepository(session)
        initial = await repo.count()
        user = User(display_name="Count Test", email="count@example.com")
        await repo.create(user)
        after = await repo.count()
        assert after == initial + 1

    async def test_exists(self, session):
        repo = UserRepository(session)
        user = User(display_name="Exists Test", email="exists@example.com")
        created = await repo.create(user)
        assert await repo.exists(created.id) is True
        assert await repo.exists("00000000-0000-7000-0000-000000000000") is False

    async def test_list_by_role(self, session):
        repo = UserRepository(session)
        admin = User(display_name="Admin", email="admin@test.com", role="admin")
        viewer = User(
            display_name="Viewer", email="viewer@test.com", role="viewer"
        )
        await repo.create(admin)
        await repo.create(viewer)
        admins = await repo.list_by_role("admin")
        assert all(u.role == "admin" for u in admins)

    async def test_get_or_create_existing(self, session):
        repo = UserRepository(session)
        user = User(display_name="Original", email="goc@example.com")
        await repo.create(user)
        fetched, created = await repo.get_or_create(
            "goc@example.com", {"display_name": "Duplicate"}
        )
        assert created is False
        assert fetched.display_name == "Original"

    async def test_get_or_create_new(self, session):
        repo = UserRepository(session)
        fetched, created = await repo.get_or_create(
            "newuser@example.com",
            {"display_name": "New User", "role": "admin"},
        )
        assert created is True
        assert fetched.display_name == "New User"


class TestObjectiveRepository:
    async def test_create_objective(self, session):
        repo = ObjectiveRepository(session)
        obj = Objective(raw_input="Increase revenue by 20%")
        created = await repo.create(obj)
        assert created.id is not None

    async def test_get_objective(self, session):
        repo = ObjectiveRepository(session)
        obj = Objective(raw_input="Test objective")
        created = await repo.create(obj)
        fetched = await repo.get(created.id)
        assert fetched is not None
        assert fetched.raw_input == "Test objective"

    async def test_update_objective(self, session):
        repo = ObjectiveRepository(session)
        obj = Objective(raw_input="Original", status="draft")
        created = await repo.create(obj)
        updated = await repo.update(created.id, {"status": "compiled"})
        assert updated is not None
        assert updated.status == "compiled"

    async def test_list_by_status(self, session):
        repo = ObjectiveRepository(session)
        compiled = Objective(raw_input="C1", status="compiled")
        draft = Objective(raw_input="D1", status="draft")
        await repo.create(compiled)
        await repo.create(draft)
        results = await repo.list_by_status("compiled")
        assert all(o.status == "compiled" for o in results)


class TestJobRepository:
    async def test_create_job(self, session):
        repo = JobRepository(session)
        job = Job(job_type="compile_objective")
        created = await repo.create(job)
        assert created.id is not None
        assert created.job_type == "compile_objective"

    async def test_get_job(self, session):
        repo = JobRepository(session)
        job = Job(job_type="test_job")
        created = await repo.create(job)
        fetched = await repo.get(created.id)
        assert fetched is not None

    async def test_list_pending_in_order(self, session):
        repo = JobRepository(session)
        j1 = Job(job_type="type_a", status="pending")
        j2 = Job(job_type="type_b", status="pending")
        await repo.create(j1)
        await repo.create(j2)
        pending = await repo.list_pending()
        assert len(pending) >= 2

    async def test_mark_started(self, session):
        repo = JobRepository(session)
        job = Job(job_type="test_job", status="pending")
        created = await repo.create(job)
        started = await repo.mark_started(created.id, worker="w1")
        assert started is not None
        assert started.status == "running"
        assert started.worker == "w1"

    async def test_mark_completed(self, session):
        repo = JobRepository(session)
        job = Job(job_type="test_job", status="running")
        created = await repo.create(job)
        completed = await repo.mark_completed(created.id, {"output": "ok"})
        assert completed is not None
        assert completed.status == "completed"
        assert completed.progress == 100.0

    async def test_mark_failed(self, session):
        repo = JobRepository(session)
        job = Job(job_type="test_job", status="running")
        created = await repo.create(job)
        failed = await repo.mark_failed(created.id, {"message": "error occurred"})
        assert failed is not None
        assert failed.status == "failed"
