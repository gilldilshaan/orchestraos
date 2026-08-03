"""Tests for MemoryKnowledgeService (Knowledge Center aggregations)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from app.models.memory import Memory
from app.services.memory_knowledge import (
    MemoryKnowledgeService,
    _category_from_tags,
    _cosine,
    _status_from_tags,
)


def _memory(**kwargs) -> Memory:
    mem = Memory(
        objective_id=kwargs.pop("objective_id", "obj-1"),
        executive_id=kwargs.pop("executive_id", None),
        embedding=kwargs.pop("embedding", None),
        tags=kwargs.pop("tags", None),
        confidence=kwargs.pop("confidence", 0.8),
        content=kwargs.pop("content", None),
        history=kwargs.pop("history", None),
    )
    mem.id = kwargs.pop("id", "mem-1")
    now = kwargs.pop("created_at", datetime.now(UTC))
    mem.created_at = now
    mem.updated_at = kwargs.pop("updated_at", now + timedelta(days=1))
    mem.metadata_ = kwargs.pop("metadata_", None)
    return mem


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def svc(mock_session):
    return MemoryKnowledgeService(mock_session)


class TestHelpers:
    def test_cosine_same_vectors(self):
        assert _cosine([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)

    def test_cosine_orthogonal(self):
        assert _cosine([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)

    def test_cosine_mismatched_lengths(self):
        assert _cosine([1.0], [1.0, 2.0]) == 0.0

    def test_category_from_tags(self):
        assert _category_from_tags(["risk:finance"]) == "risk"
        assert _category_from_tags(["has-lessons"]) == "lessons"
        assert _category_from_tags(["has-success-factors"]) == "success"
        assert _category_from_tags(["status:in_progress"]) == "outcome"
        assert _category_from_tags([]) == "general"

    def test_status_from_tags(self):
        assert _status_from_tags(["status:completed", "risk:x"]) == "completed"
        assert _status_from_tags(None) == "completed"


class TestSearchByText:
    @pytest.mark.asyncio
    async def test_empty_query(self, svc):
        result = await svc.search_by_text("   ")
        assert result == {"query": "   ", "hits": []}

    @pytest.mark.asyncio
    async def test_hits_payload(self, svc):
        hit_memory = {"id": "mem-1", "objective_id": "obj-1", "tags": ["risk:finance"], "_similarity_score": 0.87}
        with patch("app.llm.client.llm_client.aembed", new=AsyncMock(return_value=[[0.1] * 8])), \
             patch.object(svc._memory_service, "search_similar", return_value=[hit_memory]), \
             patch.object(svc, "_departments_by_objective", new=AsyncMock(return_value={"obj-1": ["Engineering"]})):
            result = await svc.search_by_text("supply chain risk")

        assert result["query"] == "supply chain risk"
        assert len(result["hits"]) == 1
        hit = result["hits"][0]
        assert hit["similarity_score"] == 0.87
        assert hit["departments"] == ["Engineering"]
        assert hit["category"] == "risk"
        assert hit["memory"]["id"] == "mem-1"
        assert "_similarity_score" not in hit["memory"]

    @pytest.mark.asyncio
    async def test_no_embeddings_from_client(self, svc):
        with patch("app.llm.client.llm_client.aembed", new=AsyncMock(return_value=[])):
            result = await svc.search_by_text("anything")
        assert result == {"query": "anything", "hits": []}


class TestAnalytics:
    @pytest.mark.asyncio
    async def test_empty_store(self, svc):
        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_decision_rows", new=AsyncMock(return_value=[])):
            result = await svc.analytics()

        assert result["total_memories"] == 0
        assert result["total_strategies"] == 0
        assert result["total_objectives"] == 0
        assert result["total_decisions"] == 0
        assert result["average_confidence"] == 0.0
        assert result["reuse_rate"] == 0.0
        assert result["planning_improvement"] == 0.0
        assert len(result["charts"]["memory_growth"]) == 30
        assert result["top_categories"] == []

    @pytest.mark.asyncio
    async def test_totals_and_reuse(self, svc):
        memories = [
            _memory(
                objective_id="obj-1",
                confidence=0.9,
                tags=["has-strategy", "status:completed"],
                content={"summary": "A", "strategy": "strategy-1", "lessons_learned": [{"lesson": "l1"}]},
                history=[{"action": "reused", "timestamp": "2026-07-01T10:00:00+00:00"}],
                metadata_={"usage_count": 3},
            ),
            _memory(
                id="mem-2",
                objective_id="obj-2",
                confidence=0.5,
                tags=[],
                content={"summary": "B"},
                history=[],
            ),
        ]
        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=memories)), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_decision_rows", new=AsyncMock(return_value=[])):
            result = await svc.analytics()

        assert result["total_memories"] == 2
        assert result["total_strategies"] == 1
        assert result["total_lessons"] == 1
        assert result["average_confidence"] == pytest.approx(0.7)
        assert result["reuse_rate"] == 0.5
        assert [c["category"] for c in result["top_categories"]] == ["outcome", "general"]
        assert result["most_retrieved_memories"][0]["memory_id"] == "mem-1"

    @pytest.mark.asyncio
    async def test_planning_improvement(self, svc):
        class FakePlan:
            def __init__(self, objective_id, metadata_):
                self.objective_id = objective_id
                self.metadata_ = metadata_
                self.created_at = datetime(2026, 7, 6, 10, 0, tzinfo=UTC)

        class FakeObjective:
            def __init__(self, objective_id, confidence):
                self.id = objective_id
                self.confidence = confidence
                self.status = "in_progress"
                self.created_at = datetime(2026, 7, 1, 8, 0, tzinfo=UTC)
                self.updated_at = datetime(2026, 7, 1, 8, 0, tzinfo=UTC)

        plans = [
            FakePlan("obj-1", {"memory_references": [{"memory_id": "mem-1"}]}),
            FakePlan("obj-2", {}),
        ]
        objectives = [
            FakeObjective("obj-1", 0.9),
            FakeObjective("obj-2", 0.6),
        ]
        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=objectives)), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=plans)), \
             patch.object(svc, "_load_decision_rows", new=AsyncMock(return_value=[])):
            result = await svc.analytics()

        assert result["planning_improvement"] == pytest.approx(0.3)


class TestTimeline:
    def _memories(self):
        created = datetime(2026, 7, 1, 9, 0, tzinfo=UTC)
        m1 = _memory(
            objective_id="obj-1",
            tags=["status:completed"],
            confidence=0.9,
            content={"summary": "Logistics overhaul"},
            history=[
                {"action": "retrieved", "timestamp": "2026-07-02T10:00:00+00:00"},
                {"action": "reused", "timestamp": "2026-07-03T10:00:00+00:00"},
                {"action": "updated", "timestamp": "2026-07-04T10:00:00+00:00"},
            ],
            created_at=created,
        )
        m2 = _memory(
            id="mem-2",
            objective_id="obj-2",
            tags=["risk:supply"],
            confidence=0.5,
            content={"summary": "Vendor risk"},
            history=[],
            created_at=created,
        )
        return m1, m2

    @pytest.mark.asyncio
    async def test_event_types_present(self, svc):
        m1, m2 = self._memories()

        class FakeObjective:
            def __init__(self, oid, status, raw):
                self.id = oid
                self.status = status
                self.raw_input = raw
                self.compiled_summary = None
                self.updated_at = datetime(2026, 7, 5, 8, 0, tzinfo=UTC)
                self.created_at = datetime(2026, 7, 1, 8, 0, tzinfo=UTC)

        objectives = [
            FakeObjective("obj-1", "completed", "objective 1 raw"),
            FakeObjective("obj-2", "in_progress", "objective 2 raw"),
        ]
        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[m1, m2])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=objectives)), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_departments_by_objective", new=AsyncMock(return_value={"obj-1": ["Ops"]})):
            result = await svc.timeline()

        types = {e["type"] for e in result["events"]}
        assert {"created", "retrieved", "reused", "updated", "execution_completed"} <= types
        assert result["total"] >= 6

    @pytest.mark.asyncio
    async def test_filters(self, svc):
        m1, m2 = self._memories()
        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[m1, m2])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_departments_by_objective", new=AsyncMock(return_value={"obj-1": ["Ops"]})):
            by_category = await svc.timeline(category="risk")
            assert all(e["category"] == "risk" for e in by_category["events"])

            by_department = await svc.timeline(department="Ops")
            assert all("Ops" in e["department"] for e in by_department["events"])

            by_status = await svc.timeline(status="completed")
            assert all(e["status"] == "completed" for e in by_status["events"])

            by_search = await svc.timeline(search="logistics")
            assert all("logistics" in (e["title"] + e["objective_summary"]).lower() for e in by_search["events"])

            dated = await svc.timeline(start_date="2026-07-04", end_date="2026-07-04")
            assert dated["total"] >= 1

    @pytest.mark.asyncio
    async def test_pagination(self, svc):
        m1, m2 = self._memories()
        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[m1, m2])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_departments_by_objective", new=AsyncMock(return_value={})):
            page = await svc.timeline(skip=0, limit=2)
            assert len(page["events"]) == 2
            assert page["total"] == 5  # m1: created + retrieved + reused + updated, m2: created

    @pytest.mark.asyncio
    async def test_plan_reuse_backfill(self, svc):
        m1, m2 = self._memories()

        class FakePlan:
            def __init__(self):
                self.id = "plan-1"
                self.objective_id = "obj-2"
                self.created_at = datetime(2026, 7, 6, 10, 0, tzinfo=UTC)
                self.metadata_ = {"memory_references": [{"memory_id": "mem-1", "strategy_reused": "strategy-1"}]}

        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[m1, m2])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[FakePlan()])), \
             patch.object(svc, "_departments_by_objective", new=AsyncMock(return_value={})):
            result = await svc.timeline()

        reused = [e for e in result["events"] if e["type"] == "reused"]
        assert any(e["extra"].get("plan_id") == "plan-1" for e in reused)


class TestGraph:
    @pytest.mark.asyncio
    async def test_nodes_and_edges(self, svc):
        m1 = _memory(
            objective_id="obj-1",
            embedding=[1.0, 0.0, 0.0],
            content={
                "summary": "Objective one",
                "strategy": "Runway expansion",
                "lessons_learned": [{"lesson": "Start procurement early"}],
            },
        )
        m2 = _memory(
            id="mem-2",
            objective_id="obj-2",
            embedding=[0.98, 0.1, 0.0],
            content={"summary": "Objective two"},
        )

        class FakePlan:
            def __init__(self):
                self.id = "plan-1"
                self.objective_id = "obj-2"
                self.metadata_ = {"memory_references": [{"memory_id": "mem-1", "strategy_reused": "Runway expansion"}]}

        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[m1, m2])), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[FakePlan()])):
            result = await svc.graph(similarity_threshold=0.5)

        types = {n["type"] for n in result["nodes"]}
        assert {"objective", "strategy", "lesson"} <= types
        edge_types = {e["type"] for e in result["edges"]}
        assert {"derived_from", "reuse", "similarity"} <= edge_types
        assert len(result["nodes"]) >= 4

    @pytest.mark.asyncio
    async def test_similarity_threshold_excludes_weak_links(self, svc):
        m1 = _memory(objective_id="obj-1", embedding=[1.0, 0.0])
        m2 = _memory(id="mem-2", objective_id="obj-2", embedding=[0.0, 1.0])
        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[m1, m2])), \
             patch.object(svc, "_load_plans", new=AsyncMock(return_value=[])):
            result = await svc.graph(similarity_threshold=0.9)
        assert not any(e["type"] == "similarity" for e in result["edges"])


class TestGlobalSearch:
    @pytest.mark.asyncio
    async def test_empty_query(self, svc):
        result = await svc.global_search("")
        assert result["total"] == 0
        assert set(result["groups"].keys()) == {
            "objectives", "strategies", "lessons", "risks", "decisions", "tags", "memories",
        }

    @pytest.mark.asyncio
    async def test_grouped_hits(self, svc):
        m1 = _memory(
            objective_id="obj-1",
            tags=["status:completed"],
            content={
                "summary": "Cloud migration",
                "strategy": "Lift and shift with guardrails",
                "lessons_learned": [{"lesson": "Freeze changes during cutover", "context": "migration"}],
                "risks": [{"title": "Data loss", "description": "Rollback risk", "mitigation": "Backups"}],
                "decisions": [{"title": "Use Terraform", "description": "IaC everywhere", "impact": "high"}],
            },
        )

        class FakeObjective:
            id = "obj-1"
            raw_input = "Cloud migration of data platform"

        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[m1])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=[FakeObjective()])), \
             patch.object(svc, "_load_decision_rows", new=AsyncMock(return_value=[])):
            result = await svc.global_search("cloud")
            assert result["total"] >= 2
            assert result["groups"]["objectives"]
            assert result["groups"]["memories"]

            result = await svc.global_search("completed")
            assert result["groups"]["tags"]
            assert result["groups"]["tags"][0]["tag"] == "status:completed"

            result = await svc.global_search("guardrails")
            assert result["groups"]["strategies"]
            assert result["groups"]["strategies"][0]["strategy"] == "Lift and shift with guardrails"

            result = await svc.global_search("rollback")
            assert result["groups"]["risks"]
            assert result["groups"]["risks"][0]["title"] == "Data loss"

    @pytest.mark.asyncio
    async def test_decision_rows_matched(self, svc):
        class FakeDecision:
            def __init__(self):
                self.id = "dec-1"
                self.title = "Adopt zero-trust networking"
                self.recommendation = "Phase rollout by region"
                self.status = "approved"
                self.objective_id = "obj-1"

        class FakeObjective:
            id = "obj-1"
            raw_input = "security"

        with patch.object(svc._memory_service._repo, "list_all", new=AsyncMock(return_value=[])), \
             patch.object(svc, "_load_objectives", new=AsyncMock(return_value=[FakeObjective()])), \
             patch.object(svc, "_load_decision_rows", new=AsyncMock(return_value=[FakeDecision()])):
            result = await svc.global_search("zero-trust")

        assert result["groups"]["decisions"]
        assert result["groups"]["decisions"][0]["title"] == "Adopt zero-trust networking"
        assert result["groups"]["decisions"][0]["impact"] == "approved"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
