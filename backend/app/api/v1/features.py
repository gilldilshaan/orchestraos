from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.schemas import ApiResponse
from app.schemas.features import (
    AdaptiveReplanRequest,
    DecisionMemoryEntryCreate,
    DevilsAdvocateRequest,
    MissingInfoRefineRequest,
    ScenarioSimulateRequest,
)
from app.services.bottleneck_detection import BottleneckDetectionService
from app.services.business_readiness import BusinessReadinessService
from app.services.decision_memory import DecisionMemoryService
from app.services.dependency_engine import DependencyEngineService
from app.services.missing_info_detector import MissingInfoDetectorService
from app.services.resource_gap import ResourceGapService
from app.services.scenario_simulator import ScenarioSimulatorService
from app.services.success_probability import SuccessProbabilityService

router = APIRouter(prefix="/features", tags=["Features"])


# ─── Feature 1: Business Readiness Assessment ────────────────────────────

@router.post("/{objective_id}/readiness/assess", response_model=ApiResponse)
async def assess_readiness(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BusinessReadinessService(session)
    result = await service.assess(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/readiness", response_model=ApiResponse)
async def get_readiness(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BusinessReadinessService(session)
    result = await service.get_assessment(objective_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "Assessment not found. Run assessment first."})
    return ApiResponse(data=result)


# ─── Feature 2: Missing Information Detector ─────────────────────────────

@router.post("/{objective_id}/missing-info/check", response_model=ApiResponse)
async def check_missing_info(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = MissingInfoDetectorService(session)
    result = await service.check(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.post("/{objective_id}/missing-info/refine", response_model=ApiResponse)
async def refine_missing_info(
    objective_id: str,
    body: MissingInfoRefineRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = MissingInfoDetectorService(session)
    result = await service.refine(objective_id, body.answers)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/missing-info", response_model=ApiResponse)
async def get_missing_info(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = MissingInfoDetectorService(session)
    result = await service.get_check(objective_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "No check found. Run check first."})
    return ApiResponse(data=result)


# ─── Feature 3: AI Devil's Advocate Agent ────────────────────────────────

@router.post("/{objective_id}/devils-advocate", response_model=ApiResponse)
async def run_devils_advocate(
    objective_id: str,
    body: DevilsAdvocateRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.agents.devils_advocate_agent import DevilsAdvocateAgent

    agent = DevilsAdvocateAgent(session)
    result = await agent.run(objective_id, body.plan_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/devils-advocate/latest", response_model=ApiResponse)
async def get_latest_devils_advocate(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.repositories.features_repository import DevilsAdvocateRepository

    repo = DevilsAdvocateRepository(session)
    critique = await repo.get_latest_by_objective(objective_id)
    if not critique:
        return ApiResponse(data=None, meta={"message": "No critique found. Run Devil's Advocate first."})
    return ApiResponse(data={
        "id": critique.id,
        "objective_id": critique.objective_id,
        "plan_id": critique.plan_id,
        "critique_score": critique.critique_score,
        "counter_arguments": critique.counter_arguments,
        "risks": critique.risks,
        "assumptions": critique.assumptions,
        "better_alternatives": critique.better_alternatives,
        "recommendations": critique.recommendations,
        "created_at": critique.created_at.isoformat() if critique.created_at else None,
    })


# ─── Feature 4: Success Probability Engine ───────────────────────────────

@router.post("/{objective_id}/success-probability", response_model=ApiResponse)
async def calculate_success_probability(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = SuccessProbabilityService(session)
    result = await service.calculate(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/success-probability", response_model=ApiResponse)
async def get_success_probability(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = SuccessProbabilityService(session)
    result = await service.get_probability(objective_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "Probability not found. Calculate first."})
    return ApiResponse(data=result)


# ─── Feature 5: Resource Gap Analysis ────────────────────────────────────

@router.post("/{objective_id}/resource-gaps/analyze", response_model=ApiResponse)
async def analyze_resource_gaps(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ResourceGapService(session)
    result = await service.analyze(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/resource-gaps", response_model=ApiResponse)
async def get_resource_gaps(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ResourceGapService(session)
    result = await service.get_gap(objective_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "Resource gap not found. Analyze first."})
    return ApiResponse(data=result)


# ─── Feature 6: Smart Dependency Engine ──────────────────────────────────

@router.post("/{objective_id}/dependencies/build", response_model=ApiResponse)
async def build_dependency_graph(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = DependencyEngineService(session)
    result = await service.build_graph(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/dependencies", response_model=ApiResponse)
async def get_dependency_graph(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = DependencyEngineService(session)
    result = await service.get_graph(objective_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "Dependency graph not found. Build first."})
    return ApiResponse(data=result)


# ─── Feature 7: Bottleneck Detection ─────────────────────────────────────

@router.post("/{objective_id}/bottlenecks/scan", response_model=ApiResponse)
async def scan_bottlenecks(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BottleneckDetectionService(session)
    result = await service.scan(objective_id)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/bottlenecks", response_model=ApiResponse)
async def list_bottlenecks(
    objective_id: str,
    severity: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BottleneckDetectionService(session)
    result = await service.list_bottlenecks(
        objective_id, severity=severity, status=status, skip=skip, limit=limit
    )
    return ApiResponse(data=result)


@router.post("/bottlenecks/{bottleneck_id}/resolve", response_model=ApiResponse)
async def resolve_bottleneck(
    bottleneck_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = BottleneckDetectionService(session)
    result = await service.resolve_bottleneck(bottleneck_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "Bottleneck not found"})
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


# ─── Feature 8: Executive Dashboard ──────────────────────────────────────

@router.get("/{objective_id}/executive-dashboard", response_model=ApiResponse)
async def get_executive_dashboard(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.services.engine import DashboardAggregator

    base = DashboardAggregator(session)
    base_dashboard = await base.get_dashboard(objective_id)

    readiness_service = BusinessReadinessService(session)
    readiness = await readiness_service.get_assessment(objective_id)

    prob_service = SuccessProbabilityService(session)
    probability = await prob_service.get_probability(objective_id)

    gap_service = ResourceGapService(session)
    resource_gaps = await gap_service.get_gap(objective_id)

    dep_service = DependencyEngineService(session)
    deps = await dep_service.get_graph(objective_id)

    bottleneck_service = BottleneckDetectionService(session)
    bottlenecks = await bottleneck_service.list_bottlenecks(objective_id)

    from app.repositories.features_repository import DevilsAdvocateRepository
    da_repo = DevilsAdvocateRepository(session)
    da = await da_repo.get_latest_by_objective(objective_id)
    devils_advocate_data = None
    if da:
        devils_advocate_data = {
            "critique_score": da.critique_score,
            "counter_arguments": da.counter_arguments[:3],
            "created_at": da.created_at.isoformat() if da.created_at else None,
        }

    overall_health = {
        "readiness_score": readiness["overall_score"] if readiness else None,
        "success_probability": probability["success_probability"] if probability else None,
        "bottleneck_count": len(bottlenecks) if bottlenecks else 0,
        "critical_bottlenecks": (
            sum(1 for b in bottlenecks if b.get("severity") == "critical")
            if bottlenecks else 0
        ),
        "has_devils_advocate": devils_advocate_data is not None,
    }

    return ApiResponse(data={
        "base_dashboard": base_dashboard,
        "business_readiness": readiness,
        "success_probability": probability,
        "resource_gaps": resource_gaps,
        "dependency_graph": deps,
        "bottlenecks": bottlenecks,
        "devils_advocate": devils_advocate_data,
        "overall_health": overall_health,
    })


# ─── Feature 9: Decision Memory ──────────────────────────────────────────

@router.post("/decision-memory", response_model=ApiResponse)
async def record_decision(
    body: DecisionMemoryEntryCreate,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = DecisionMemoryService(session)
    result = await service.record_decision(
        objective_id=body.objective_id,
        decision_id=body.decision_id,
        title=body.title,
        decision_text=body.decision_text,
        reason=body.reason,
        evidence=body.evidence,
        alternatives=body.alternatives,
        approver=body.approver,
        decision_date=body.decision_date,
        impact=body.impact,
        tags=body.tags,
    )
    return ApiResponse(data=result)


@router.get("/decision-memory", response_model=ApiResponse)
async def list_decision_memory(
    objective_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = DecisionMemoryService(session)
    result = await service.list_decisions(
        objective_id=objective_id, skip=skip, limit=limit
    )
    return ApiResponse(data=result)


@router.get("/decision-memory/{entry_id}", response_model=ApiResponse)
async def get_decision_memory_entry(
    entry_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = DecisionMemoryService(session)
    result = await service.get_decision(entry_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "Entry not found"})
    return ApiResponse(data=result)


# ─── Feature 10: Adaptive Replanning (enhanced) ─────────────────────────

@router.post("/{objective_id}/replan", response_model=ApiResponse)
async def adaptive_replan(
    objective_id: str,
    body: AdaptiveReplanRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.repositories.extensions_repository import PlanRepository
    from app.services.engine import AdaptiveReplanningService

    plans = await PlanRepository(session).list_by_objective(objective_id)
    if not plans:
        return ApiResponse(data=None, meta={"message": "No plans found for this objective"})

    plan_id = plans[0].id
    changes = body.model_dump(exclude_none=True)
    if not changes:
        return ApiResponse(data=None, meta={"message": "No changes provided"})

    service = AdaptiveReplanningService(session)
    result = await service.replan(plan_id, changes)
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})

    # Also auto-record the replanning decision
    memory_service = DecisionMemoryService(session)
    await memory_service.record_decision(
        objective_id=objective_id,
        title="Adaptive Replanning",
        decision_text=f"Plan {plan_id} was replanned due to changes: {changes}",
        reason=result.get("diff_summary", "Plan adjusted"),
        tags=["adaptive_replanning", "plan_update"],
    )

    return ApiResponse(data=result)


# ─── Feature 11: Scenario Simulator (enhanced) ──────────────────────────

@router.post("/simulate", response_model=ApiResponse)
async def run_simulation(
    body: ScenarioSimulateRequest,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ScenarioSimulatorService(session)
    result = await service.simulate(
        objective_id=body.objective_id,
        parameters=body.parameters,
        base_plan_id=body.base_plan_id,
        name=body.name,
        description=body.description,
    )
    if "error" in result:
        return ApiResponse(data=None, meta={"message": result["error"]})
    return ApiResponse(data=result)


@router.get("/{objective_id}/scenarios", response_model=ApiResponse)
async def list_scenarios(
    objective_id: str,
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ScenarioSimulatorService(session)
    result = await service.list_scenarios(objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


@router.get("/scenarios/{scenario_id}", response_model=ApiResponse)
async def get_scenario(
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    service = ScenarioSimulatorService(session)
    result = await service.get_scenario(scenario_id)
    if not result:
        return ApiResponse(data=None, meta={"message": "Scenario not found"})
    return ApiResponse(data=result)


# ─── Feature 12: Explainable AI ──────────────────────────────────────────

@router.get("/explanations/{entity_type}/{entity_id}", response_model=ApiResponse)
async def get_explanations(
    entity_type: str,
    entity_id: str,
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    from app.services.engine import ExplanationService

    service = ExplanationService(session)
    result = await service.get_explanations(entity_type, entity_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


# ─── Kernel Stats ────────────────────────────────────────────────────────

@router.get("/kernel/stats", response_model=ApiResponse)
async def get_kernel_stats() -> ApiResponse:
    from app.kernel import ai_kernel

    stats = ai_kernel.get_stats()
    return ApiResponse(data=stats)


@router.post("/kernel/reset", response_model=ApiResponse)
async def reset_kernel() -> ApiResponse:
    from app.kernel import ai_kernel

    ai_kernel.reset()
    return ApiResponse(data={"status": "reset"})
