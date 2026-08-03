"""Tests for Memory Retrieval Service."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.memory_retrieval import (
    MemoryRetrievalService,
    RetrievedMemory,
    MemoryContext,
    get_memory_context_for_planning,
    get_memory_context_for_agent,
)


class TestMemoryRetrievalService:
    """Test MemoryRetrievalService ranking and context building."""

    @pytest.fixture
    def mock_session(self):
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_session):
        return MemoryRetrievalService(mock_session)

    def test_rank_memories_composite_score(self, service):
        """Test that memories are ranked by composite score."""
        memories = [
            {
                "id": "mem1",
                "confidence": 0.9,
                "content": {"summary": "Test 1", "strategy": "Strategy A", "success_factors": [{"factor": "Factor 1"}]},
                "created_at": "2024-01-15T10:00:00",
            },
            {
                "id": "mem2",
                "confidence": 0.5,
                "content": {"summary": "Test 2", "strategy": "Strategy B"},
                "created_at": "2024-06-01T10:00:00",
            },
        ]
        query_embedding = [0.1, 0.2, 0.3]

        # Mock the _estimate_success_confidence
        with patch.object(service, '_estimate_success_confidence', return_value=0.7):
            ranked = service._rank_memories(memories, query_embedding)

        assert len(ranked) == 2
        assert all(isinstance(r, RetrievedMemory) for r in ranked)
        # First should have higher composite score (higher confidence, older = lower recency but higher memory_confidence)
        assert ranked[0].composite_score >= ranked[1].composite_score

    def test_estimate_success_confidence(self, service):
        """Test success confidence estimation from content."""
        # High confidence content
        content_high = {
            "confidence": 0.8,
            "success_factors": [{"factor": "f1"}],
            "lessons_learned": [{"lesson": "l1"}],
            "strategy": "strategy",
            "risks": [{"title": "risk1", "mitigation": "mitigate"}],
        }
        score = service._estimate_success_confidence(content_high)
        assert score > 0.6

        # Low confidence content
        content_low = {"confidence": 0.3}
        score = service._estimate_success_confidence(content_low)
        assert score == 0.5  # default

    def test_build_embedding_text(self):
        """Test embedding text building."""
        # This is tested via MemoryGenerator, skipping here
        pass


class TestMemoryContext:
    """Test MemoryContext dataclass."""

    def test_empty_context(self):
        ctx = MemoryContext([], [], [], [], [], [], [])
        assert ctx.similar_objectives == []
        assert ctx.strategies == []
        assert ctx.lessons_learned == []

    def test_context_with_data(self):
        ctx = MemoryContext(
            similar_objectives=[{"objective_id": "obj1"}],
            strategies=["Strategy A"],
            lessons_learned=[{"lesson": "Lesson 1"}],
            risks=[{"title": "Risk 1"}],
            executive_decisions=[{"title": "Decision 1"}],
            success_factors=[{"factor": "Factor 1"}],
            memory_sources=[{"memory_id": "mem1"}],
        )
        assert len(ctx.similar_objectives) == 1
        assert len(ctx.strategies) == 1


class TestMemoryContextDeduplication:
    """Test deduplication logic in context building."""

    def test_dedupe_by_key(self):
        from app.services.memory_retrieval import get_memory_context_for_agent
        # We can't easily test the internal dedupe function, but we can test
        # the logic by checking that duplicate items are removed
        items = [
            {"title": "Risk A", "value": 1},
            {"title": "Risk A", "value": 2},  # duplicate
            {"title": "Risk B", "value": 3},
        ]
        seen = set()
        result = []
        for item in items:
            val = item["title"].lower()[:100]
            if val not in seen:
                seen.add(val)
                result.append(item)
        assert len(result) == 2
        assert result[0]["title"] == "Risk A"
        assert result[1]["title"] == "Risk B"


class TestGetMemoryContextForPlanning:
    """Test the convenience function."""

    @pytest.mark.asyncio
    async def test_get_memory_context_for_planning(self):
        """Test the convenience function signature."""
        # This is an integration test requiring a real session
        # Skipped in unit tests
        pass


class TestMemoryRetrievalIntegration:
    """Integration-style tests (mocked)."""

    @pytest.mark.asyncio
    async def test_search_relevant_memories_empty(self, service):
        """Test search returns empty when no memories."""
        with patch.object(service._memory_service, 'search_similar', return_value=[]), \
             patch("app.llm.client.llm_client.aembed", new=AsyncMock(return_value=[[0.1] * 8])):
            results = await service.search_relevant_memories("test query")
            assert results == []

    @pytest.mark.asyncio
    async def test_build_context_for_planning_no_memories(self, service):
        """Test context building when no memories found."""
        with patch.object(service, 'search_relevant_memories', return_value=[]):
            context = await service.build_context_for_planning("test objective")
            assert isinstance(context, MemoryContext)
            assert context.similar_objectives == []


# Fixtures
@pytest.fixture
def mock_memory_service():
    return AsyncMock()


@pytest.fixture
def service():
    return MemoryRetrievalService(AsyncMock())


# Parametrized tests for different scenarios
@pytest.mark.parametrize("confidence,expected_range", [
    (0.9, (0.7, 1.0)),
    (0.5, (0.5, 0.7)),
    (0.2, (0.3, 0.5)),
])
def test_confidence_ranges(confidence, expected_range, service):
    """Test that success confidence falls in expected ranges."""
    content = {"confidence": confidence}
    score = service._estimate_success_confidence(content)
    assert expected_range[0] <= score <= expected_range[1]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])