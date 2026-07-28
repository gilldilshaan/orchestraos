from __future__ import annotations

import uuid

from app.database.uuid7 import uuid7
from app.models.job import Job
from app.models.objective import Objective
from app.models.user import User


class TestUUID7:
    def test_returns_valid_uuid(self):
        result = uuid7()
        assert isinstance(result, uuid.UUID)

    def test_version_is_7(self):
        result = uuid7()
        assert result.version == 7

    def test_variant_is_rfc_4122(self):
        result = uuid7()
        assert result.variant == uuid.RFC_4122

    def test_unique_across_calls(self):
        ids = {uuid7() for _ in range(1000)}
        assert len(ids) == 1000

    def test_monotonic_timestamp(self):
        ids = [uuid7() for _ in range(100)]
        timestamps = [int.from_bytes(u.bytes[0:6], "big") for u in ids]
        assert timestamps == sorted(timestamps)


class TestUserModel:
    def test_create_minimal(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.display_name == "Test User"
        assert user.email == "test@example.com"

    def test_default_role(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.role == "viewer"

    def test_default_version(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.version == 1

    def test_id_is_uuid7(self):
        user = User(display_name="Test User", email="test@example.com")
        uid = user.id if isinstance(user.id, uuid.UUID) else uuid.UUID(str(user.id))
        assert uid.version == 7

    def test_created_at_set(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.created_at is not None

    def test_created_by_nullable(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.created_by is None

    def test_metadata_nullable(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.metadata_ is None

    def test_organization_nullable(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.organization is None

    def test_auth_user_id_nullable(self):
        user = User(display_name="Test User", email="test@example.com")
        assert user.auth_user_id is None

    def test_with_all_fields(self):
        user = User(
            display_name="Full User",
            email="full@example.com",
            role="admin",
            organization="Acme Corp",
            auth_user_id="auth|123",
        )
        assert user.organization == "Acme Corp"
        assert user.auth_user_id == "auth|123"

    def test_str_email(self):
        user = User(display_name="Test User", email="user@example.com")
        assert "@" in user.email


class TestObjectiveModel:
    def test_create_minimal(self):
        obj = Objective(raw_input="Increase revenue by 20%")
        assert obj.raw_input == "Increase revenue by 20%"

    def test_default_status(self):
        obj = Objective(raw_input="Test")
        assert obj.status == "draft"

    def test_default_current_stage(self):
        obj = Objective(raw_input="Test")
        assert obj.current_stage is None

    def test_confidence_nullable(self):
        obj = Objective(raw_input="Test")
        assert obj.confidence is None

    def test_constraints_default(self):
        obj = Objective(raw_input="Test")
        assert obj.constraints is None

    def test_success_criteria_default(self):
        obj = Objective(raw_input="Test")
        assert obj.success_criteria is None

    def test_compiled_summary_default(self):
        obj = Objective(raw_input="Test")
        assert obj.compiled_summary is None

    def test_structured_goal_default(self):
        obj = Objective(raw_input="Test")
        assert obj.structured_goal is None

    def test_user_id_nullable(self):
        obj = Objective(raw_input="Test")
        assert obj.user_id is None

    def test_id_is_uuid7(self):
        obj = Objective(raw_input="Test")
        uid = obj.id if isinstance(obj.id, uuid.UUID) else uuid.UUID(str(obj.id))
        assert uid.version == 7

    def test_with_all_fields(self):
        obj = Objective(
            raw_input="Test input",
            compiled_summary="Summary",
            structured_goal="Goal",
            constraints={"budget": 100000},
            success_criteria=["revenue > 20%"],
            confidence=0.85,
            status="compiled",
            current_stage="planning",
        )
        assert obj.compiled_summary == "Summary"
        assert obj.constraints == {"budget": 100000}
        assert obj.confidence == 0.85


class TestJobModel:
    def test_create_minimal(self):
        job = Job(job_type="compile_objective")
        assert job.job_type == "compile_objective"

    def test_default_status(self):
        job = Job(job_type="test")
        assert job.status == "pending"

    def test_default_progress(self):
        job = Job(job_type="test")
        assert job.progress == 0.0

    def test_started_at_nullable(self):
        job = Job(job_type="test")
        assert job.started_at is None

    def test_finished_at_nullable(self):
        job = Job(job_type="test")
        assert job.finished_at is None

    def test_worker_nullable(self):
        job = Job(job_type="test")
        assert job.worker is None

    def test_result_nullable(self):
        job = Job(job_type="test")
        assert job.result is None

    def test_error_nullable(self):
        job = Job(job_type="test")
        assert job.error is None

    def test_user_id_nullable(self):
        job = Job(job_type="test")
        assert job.user_id is None

    def test_objective_id_nullable(self):
        job = Job(job_type="test")
        assert job.objective_id is None

    def test_id_is_uuid7(self):
        job = Job(job_type="test")
        uid = job.id if isinstance(job.id, uuid.UUID) else uuid.UUID(str(job.id))
        assert uid.version == 7

    def test_with_all_fields(self):
        job = Job(
            job_type="compile_objective",
            status="running",
            progress=50.0,
            worker="worker-1",
            result={"output": "done"},
        )
        assert job.status == "running"
        assert job.progress == 50.0
        assert job.worker == "worker-1"
