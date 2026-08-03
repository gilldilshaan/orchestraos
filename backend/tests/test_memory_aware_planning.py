"""Tests for Memory-Aware Planning integration."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.tasks import PlannerAgent
from app.schemas.llm_outputs import PlanOutputSchema


class TestPlannerAgentMemoryIntegration:
    """Test PlannerAgent integration with organizational memory."""

    @pytest.fixture
    def mock_session(self):
        return AsyncMock()

    @pytest.fixture
    def planner_agent(self, mock_session):
        agent = PlannerAgent.__new__(PlannerAgent)
        agent._session = mock_session
        agent._kernel = AsyncMock()
        return agent

    @pytest.mark.asyncio
    async def test_planner_retrieves_memory_context(self, planner_agent, mock_session):
        """Test that planner calls memory retrieval before planning."""
        objective_id = "test-objective-123"

        # Mock objective repo
        mock_objective = MagicMock()
        mock_objective.raw_input = "Build a new SaaS platform"
        mock_objective.constraints = {"budget": "100000"}
        mock_objective.id = objective_id

        mock_obj_repo = AsyncMock()
        mock_obj_repo.get.return_value = mock_objective

        # Mock compilation repo
        mock_compilation = MagicMock()
        mock_compilation.mission = "Test mission"
        mock_compilation.vision = "Test vision"
        mock_compilation.budget = 100000
        mock_compilation.timeline = "6 months"

        mock_comp_repo = AsyncMock()
        mock_comp_repo.get_by_objective.return_value = mock_compilation

        # Mock plan repo
        mock_plan = MagicMock()
        mock_plan.id = "plan-123"

        mock_plan_repo = AsyncMock()
        mock_plan_repo.create.return_value = mock_plan
        mock_plan_repo.update.return_value = mock_plan

        # Mock milestone repo
        mock_milestone_repo = AsyncMock()
        mock_milestone_repo.create.return_value = MagicMock()

        # Patch repositories
        with patch("app.agents.tasks.ObjectiveRepository", return_value=mock_obj_repo), \
             patch("app.agents.tasks.ObjectiveCompilationRepository", return_value=mock_comp_repo), \
             patch("app.agents.tasks.PlanRepository", return_value=mock_plan_repo), \
             patch("app.agents.tasks.MilestoneRepository", return_value=mock_milestone_repo), \
             patch("app.agents.tasks.get_memory_context_for_planning") as mock_get_memory:

            # Mock memory context
            from app.services.memory_retrieval import MemoryContext
            mock_memory_context = MemoryContext(
                similar_objectives=[{
                    "objective_id": "prev-obj-1",
                    "summary": "Previous SaaS platform",
                    "similarity_score": 0.85,
                    "strategy": "Phased rollout",
                }],
                strategies=["Phased rollout", "Start with MVP"],
                lessons_learned=[{
                    "lesson": "Validate market before building",
                    "context": "Previous project failed due to no market validation",
                    "source_objective_id": "prev-obj-1",
                }],
                risks=[{
                    "title": "Market validation risk",
                    "description": "No market validation before building",
                    "mitigation": "Run user interviews first",
                    "source_objective_id": "prev-obj-1",
                }],
                executive_decisions=[{
                    "title": "Hire senior PM",
                    "description": "Need experienced product management",
                    "impact": "high",
                    "outcome": "successful",
                    "source_objective_id": "prev-obj-1",
                }],
                success_factors=[{
                    "factor": "Strong technical team",
                    "evidence": "Team delivered on time",
                    "reproducibility": "high",
                    "source_objective_id": "prev-obj-1",
                }],
                memory_sources=[{
                    "memory_id": "mem-1",
                    "objective_id": "prev-obj-1",
                    "similarity_score": 0.85,
                    "summary": "Previous SaaS platform build",
                }],
            )
            mock_get_memory.return_value = mock_memory_context

            # Mock LLM response
            planner_agent._llm.run.return_value = {
                "roadmap": {
                    "description": "Memory-aware plan",
                    "name": "Test Plan",
                },
                "timeline": "6 months",
                "total_cost": 100000,
                "confidence": 0.8,
                "milestones": [
                    {
                        "name": "Milestone 1",
                        "description": "Research",
                        "duration_weeks": 4,
                        "deliverables": ["Report"],
                        "dependencies": [],
                    },
                ],
                "memory_references": [
                    {
                        "memory_id": "mem-1",
                        "strategy_reused": "Phased rollout",
                        "lessons_applied": ["Validate market before building"],
                        "risks_mitigated": ["Market validation risk"],
                        "success_factors_replicated": ["Strong technical team"],
                    }
                ],
            }

            # Run planner
            result = await planner_agent.run(objective_id)

            # Verify memory context was retrieved
            mock_get_memory.assert_called_once_with(
                mock_session, "Build a new SaaS platform", objective_id, record_events=True
            )

            # Verify plan was created
            mock_plan_repo.create.assert_called_once()

            # Verify memory references stored
            mock_plan_repo.update.assert_called_once()
            update_call = mock_plan_repo.update.call_args
            assert "memory_references" in update_call[0][1].get("metadata", {})
            assert len(update_call[0][1].get("metadata", {}).get("memory_references", [])) == 1

            # Verify result includes memory info
            assert result["memory_sources_count"] == 1
            assert len(result["memory_references"]) == 1

    @pytest.mark.asyncio
    async def test_planner_without_memory(self, planner_agent, mock_session):  # noqa: ARG002
        """Test planner works normally when no memory exists."""
        objective_id = "test-objective-456"

        mock_objective = MagicMock()
        mock_objective.raw_input = "Completely novel objective"
        mock_objective.constraints = {}
        mock_objective.id = objective_id

        mock_obj_repo = AsyncMock()
        mock_obj_repo.get.return_value = mock_objective

        mock_compilation = MagicMock()
        mock_compilation.mission = "Test"
        mock_compilation.vision = "Test"
        mock_compilation.budget = 50000
        mock_compilation.timeline = "3 months"

        mock_comp_repo = AsyncMock()
        mock_comp_repo.get_by_objective.return_value = mock_compilation

        mock_plan = MagicMock()
        mock_plan.id = "plan-456"

        mock_plan_repo = AsyncMock()
        mock_plan_repo.create.return_value = mock_plan

        mock_milestone_repo = AsyncMock()

        with patch("app.agents.tasks.ObjectiveRepository", return_value=mock_obj_repo), \
             patch("app.agents.tasks.ObjectiveCompilationRepository", return_value=mock_comp_repo), \
             patch("app.agents.tasks.PlanRepository", return_value=mock_plan_repo), \
             patch("app.agents.tasks.MilestoneRepository", return_value=mock_milestone_repo), \
             patch("app.agents.tasks.get_memory_context_for_planning") as mock_get_memory:

            from app.services.memory_retrieval import MemoryContext
            mock_get_memory.return_value = MemoryContext([], [], [], [], [], [], [])

            planner_agent._llm.run.return_value = {
                "roadmap": {"description": "Standard plan"},
                "timeline": "3 months",
                "total_cost": 50000,
                "confidence": 0.6,
                "milestones": [],
                "memory_references": [],
            }

            result = await planner_agent.run(objective_id)

            assert result["status"] == "created"
            assert result["memory_sources_count"] == 0


class TestPlanOutputSchemaMemoryReferences:
    """Test PlanOutputSchema accepts memory_references."""

    def test_memory_references_field(self):
        """Test that memory_references field is valid."""
        data = {
            "roadmap": {"description": "Test"},
            "milestones": [],
            "memory_references": [
                {"memory_id": "mem-1", "strategy_reused": "Strategy A"}
            ],
        }
        schema = PlanOutputSchema(**data)
        assert schema.memory_references == [{"memory_id": "mem-1", "strategy_reused": "Strategy A"}]

    def test_memory_references_default_empty(self):
        """Test memory_references defaults to empty list."""
        schema = PlanOutputSchema()
        assert schema.memory_references == []


class TestDashboardAggregatorMemorySources:
    """Test DashboardAggregator includes memory_sources."""

    @pytest.mark.asyncio
    async def test_get_dashboard_includes_memory_sources(self):
        """Test that dashboard includes memory_sources section."""

        from app.services.engine import DashboardAggregator

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result)

        # Mock all repositories
        mock_obj = MagicMock()
        mock_obj.id = "obj-1"
        mock_obj.raw_input = "Test objective"
        mock_obj.status = "active"
        mock_obj.current_stage = "planning"
        mock_obj.confidence = 0.8
        mock_obj.created_at = MagicMock()
        mock_obj.created_at.isoformat.return_value = "2024-01-01T00:00:00"
        mock_obj.updated_at = MagicMock()
        mock_obj.updated_at.isoformat.return_value = "2024-01-01T00:00:00"

        mock_obj_repo = AsyncMock()
        mock_obj_repo.get.return_value = mock_obj

        mock_plan_repo = AsyncMock()
        mock_plan_repo.list_by_objective.return_value = []

        mock_risk_repo = AsyncMock()
        mock_risk_repo.list_by_objective.return_value = []
        mock_risk_repo.count_by_risk_level.return_value = {}

        mock_decision_repo = AsyncMock()
        mock_decision_repo.list_by_objective.return_value = []
        mock_decision_repo.count_by_status.return_value = {}
        mock_decision_repo.list_pending.return_value = []

        mock_dept_repo = AsyncMock()
        mock_dept_repo.list_by_objective.return_value = []

        mock_milestone_repo = AsyncMock()
        mock_milestone_repo.list_by_plan.return_value = []

        with patch("app.services.engine.ObjectiveRepository", return_value=mock_obj_repo), \
             patch("app.services.engine.PlanRepository", return_value=mock_plan_repo), \
             patch("app.services.engine.RiskRepository", return_value=mock_risk_repo), \
             patch("app.services.engine.DecisionRepository", return_value=mock_decision_repo), \
             patch("app.services.engine.DepartmentRepository", return_value=mock_dept_repo), \
             patch("app.services.engine.MilestoneRepository", return_value=mock_milestone_repo), \
             patch("app.services.engine.BusinessReadinessRepository") as mock_readiness, \
             patch("app.services.engine.SuccessProbabilityRepository") as mock_prob, \
             patch("app.services.engine.BottleneckRepository") as mock_bottleneck, \
             patch("app.services.engine.DevilsAdvocateRepository") as mock_da, \
             patch("app.services.engine.DecisionMemoryRepository") as mock_mem, \
             patch("app.services.engine.ExplanationRepository") as mock_expl, \
             patch("app.services.engine.JobRepository") as mock_job, \
             patch("app.services.engine.get_memory_context_for_planning") as mock_get_memory:

            mock_readiness.return_value = AsyncMock()
            mock_readiness.return_value.get_by_objective.return_value = None
            mock_prob.return_value = AsyncMock()
            mock_prob.return_value.get_by_objective.return_value = None
            mock_bottleneck.return_value = AsyncMock()
            mock_bottleneck.return_value.count_by_severity.return_value = {}
            mock_bottleneck.return_value.list_by_objective.return_value = []
            mock_da.return_value = AsyncMock()
            mock_da.return_value.get_latest_by_objective.return_value = None
            mock_mem.return_value = AsyncMock()
            mock_mem.return_value.list_by_objective.return_value = []
            mock_expl.return_value = AsyncMock()
            mock_expl.return_value.list_by_entity.return_value = []
            mock_job.return_value = AsyncMock()
            mock_job.return_value.count.return_value = 0

            from app.services.memory_retrieval import MemoryContext
            mock_get_memory.return_value = MemoryContext(
                similar_objectives=[
                    {
                        "objective_id": "prev-1",
                        "summary": "Previous",
                        "similarity_score": 0.8,
                        "strategy": "Strategy A",
                    }
                ],
                strategies=["Strategy A"],
                lessons_learned=[
                    {"lesson": "Lesson 1", "context": "Context", "source_objective_id": "prev-1"}
                ],
                risks=[
                    {
                        "title": "Risk 1",
                        "description": "Desc",
                        "mitigation": "Mitigate",
                        "source_objective_id": "prev-1",
                    }
                ],
                executive_decisions=[
                    {
                        "title": "Decision 1",
                        "description": "Desc",
                        "impact": "high",
                        "outcome": "done",
                        "source_objective_id": "prev-1",
                    }
                ],
                success_factors=[
                    {
                        "factor": "Factor 1",
                        "evidence": "Evidence",
                        "reproducibility": "high",
                        "source_objective_id": "prev-1",
                    }
                ],
                memory_sources=[
                    {
                        "memory_id": "mem-1",
                        "objective_id": "prev-1",
                        "similarity_score": 0.8,
                        "composite_score": 0.75,
                        "summary": "Summary",
                    }
                ],
            )

            aggregator = DashboardAggregator(mock_session)
            dashboard = await aggregator.get_dashboard("obj-1")

            # Verify memory_sources section exists
            assert "memory_sources" in dashboard
            assert dashboard["memory_sources"]["similar_objectives_used"] == 1
            assert dashboard["memory_sources"]["strategies_reused"] == 1
            assert dashboard["memory_sources"]["lessons_applied"] == 1
            assert dashboard["memory_sources"]["risks_avoided"] == 1
            assert len(dashboard["memory_sources"]["sources"]) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
