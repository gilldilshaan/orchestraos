"""Unit tests for the new features schemas.

Run with: python -m pytest tests/test_features.py -v
(Requires pytest installed)
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.features import (
    AdaptiveReplanRequest,
    BusinessReadinessResponse,
    DecisionMemoryEntryCreate,
    DecisionMemoryEntryResponse,
    DependencyGraphResponse,
    DevilsAdvocateRequest,
    DevilsAdvocateResponse,
    MissingInfoCheckResponse,
    MissingInfoRefineRequest,
    ResourceGapResponse,
    ScenarioSimulateRequest,
    SuccessProbabilityResponse,
)


def test_business_readiness_response_creation() -> None:
    data = {
        "id": "test-id",
        "objective_id": "obj-1",
        "overall_score": 72.5,
        "market_readiness": 78.0,
        "strengths": ["Strong demand"],
        "weaknesses": ["Limited budget"],
    }
    response = BusinessReadinessResponse(**data)
    assert response.id == "test-id"
    assert response.overall_score == 72.5
    assert response.market_readiness == 78.0
    assert response.strengths == ["Strong demand"]
    assert response.weaknesses == ["Limited budget"]


def test_business_readiness_defaults() -> None:
    response = BusinessReadinessResponse(
        id="test-id",
        objective_id="obj-1",
        overall_score=50.0,
    )
    assert response.market_readiness is None
    assert response.strengths is None
    assert response.created_at is None


def test_missing_info_response() -> None:
    data = {
        "id": "check-1",
        "objective_id": "obj-1",
        "missing_fields": ["budget", "timeline"],
        "critical_missing": ["budget"],
        "clarification_questions": ["What is your budget?"],
        "is_complete": False,
        "refinement_round": 1,
    }
    response = MissingInfoCheckResponse(**data)
    assert response.is_complete is False
    assert "budget" in response.missing_fields
    assert len(response.clarification_questions) == 1


def test_refine_request() -> None:
    req = MissingInfoRefineRequest(answers={"budget": "100000", "timeline": "6 months"})
    assert req.answers["budget"] == "100000"


def test_refine_request_empty() -> None:
    req = MissingInfoRefineRequest(answers={})
    assert req.answers == {}


def test_devils_advocate_response() -> None:
    data = {
        "id": "da-1",
        "objective_id": "obj-1",
        "critique_score": 65.0,
        "counter_arguments": [{"argument": "Budget too low", "challenge": "How?", "severity": "high"}],
        "risks": [{"risk": "Market risk", "likelihood": 0.5, "impact": 0.7}],
        "assumptions": [{"assumption": "Quick adoption", "is_unrealistic": True, "reason": "No data"}],
        "better_alternatives": [{"alternative": "Phase approach", "rationale": "Less risk", "expected_improvement": "30%"}],
    }
    response = DevilsAdvocateResponse(**data)
    assert response.critique_score == 65.0
    assert len(response.counter_arguments) == 1
    assert response.counter_arguments[0]["argument"] == "Budget too low"


def test_devils_advocate_request() -> None:
    req = DevilsAdvocateRequest(objective_id="obj-1", plan_id="plan-1")
    assert req.objective_id == "obj-1"
    assert req.plan_id == "plan-1"


def test_devils_advocate_request_minimal() -> None:
    req = DevilsAdvocateRequest(objective_id="obj-1")
    assert req.plan_id is None


def test_success_probability_response() -> None:
    data = {
        "id": "sp-1",
        "objective_id": "obj-1",
        "success_probability": 0.72,
        "failure_risk": 0.18,
        "delay_risk": 0.35,
        "budget_overrun_risk": 0.25,
        "team_risk": 0.20,
        "confidence_score": 0.80,
        "reasoning": "Strong market demand, adequate budget",
    }
    response = SuccessProbabilityResponse(**data)
    assert response.success_probability == 0.72
    assert response.reasoning is not None
    assert response.risk_factors is None


def test_resource_gap_response() -> None:
    data = {
        "id": "rg-1",
        "objective_id": "obj-1",
        "missing_roles": [{"title": "Engineer", "department": "Engineering", "count": 2}],
        "missing_skills": ["Python", "Kubernetes"],
        "hiring_needs": [{"role_title": "Engineer", "count": 2, "estimated_salary": 150000}],
        "estimated_cost": 300000.0,
        "estimated_hiring_timeline": "8 weeks",
    }
    response = ResourceGapResponse(**data)
    assert response.estimated_cost == 300000.0
    assert "Python" in response.missing_skills
    assert len(response.missing_roles) == 1


def test_dependency_graph_response() -> None:
    data = {
        "id": "dg-1",
        "objective_id": "obj-1",
        "nodes": [{"id": "ms-1", "type": "milestone", "name": "Hiring"}],
        "edges": [{"source": "ms-1", "target": "ms-2", "relationship_type": "depends_on"}],
        "critical_path": [{"step": 1, "node_id": "ms-1", "description": "Start here"}],
        "circular_dependencies": [],
        "blocked_tasks": [{"task": "Dev", "blocked_by": "Hiring", "impact": "Delay", "unblock_action": "Hire faster"}],
    }
    response = DependencyGraphResponse(**data)
    assert len(response.nodes) == 1
    assert len(response.edges) == 1
    assert len(response.critical_path) == 1
    assert response.cascade_effects is None


def test_decision_memory_create() -> None:
    data = {
        "objective_id": "obj-1",
        "title": "Budget decision",
        "reason": "Needed more funding",
        "approver": "CEO",
        "tags": ["budget", "funding"],
    }
    entry = DecisionMemoryEntryCreate(**data)
    assert entry.title == "Budget decision"
    assert entry.decision_id is None
    assert entry.alternatives is None


def test_decision_memory_create_full() -> None:
    data = {
        "objective_id": "obj-1",
        "title": "Full decision",
        "decision_text": "We decided to proceed",
        "reason": "After analysis",
        "evidence": ["Report A", "Report B"],
        "alternatives": ["Option B", "Option C"],
        "approver": "Board",
        "decision_date": datetime.now(UTC),
        "impact": "Positive",
        "tags": ["strategic"],
    }
    entry = DecisionMemoryEntryCreate(**data)
    assert len(entry.evidence) == 2


def test_decision_memory_entry_response() -> None:
    data = {
        "id": "dm-1",
        "objective_id": "obj-1",
        "title": "Test decision",
        "tags": ["test"],
    }
    response = DecisionMemoryEntryResponse(**data)
    assert response.id == "dm-1"
    assert response.reason is None


def test_scenario_simulate_request() -> None:
    req = ScenarioSimulateRequest(
        objective_id="obj-1",
        parameters={"budget_decrease": 0.2, "timeline_months": 6},
    )
    assert req.objective_id == "obj-1"
    assert req.parameters["budget_decrease"] == 0.2


def test_adaptive_replan_request() -> None:
    req = AdaptiveReplanRequest(
        budget={"total": 500000},
        timeline={"total_months": 9},
        constraints=["must be profitable"],
    )
    assert req.budget == {"total": 500000}
    assert req.business_goal is None
