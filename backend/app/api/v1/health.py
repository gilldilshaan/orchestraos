from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.session import check_database_health, get_session
from app.dependencies import get_redis_health
from app.repositories.extensions_repository import DecisionRepository, DepartmentRepository, RoleRepository
from app.repositories.objective_repository import ObjectiveRepository

router = APIRouter(tags=["Health"])

AGENT_MODULES = [
    "objective_compiler", "planner", "risk_analyzer",
    "organization_generator", "decision_engine",
    "devils_advocate", "readiness", "bottleneck",
]


@router.get("/system")
async def health_system() -> dict:
    db_healthy = await check_database_health()
    redis_healthy = await get_redis_health()

    dependencies = {
        "database": {"status": "ok" if db_healthy else "error"},
        "redis": {"status": "ok" if redis_healthy else "error"},
    }

    overall_status = "healthy"
    if not db_healthy or not redis_healthy:
        overall_status = "degraded"

    return {
        "data": {
            "status": overall_status,
            "version": settings.api_version,
            "environment": settings.app_env,
            "dependencies": dependencies,
        }
    }


@router.get("/ai")
async def health_ai(session: AsyncSession = Depends(get_session)) -> dict:
    from app.kernel import ai_kernel
    from app.llm.client import llm_client
    from app.process_info import uptime_seconds

    stats = ai_kernel.get_stats()
    obj_repo = ObjectiveRepository(session)
    dept_repo = DepartmentRepository(session)
    role_repo = RoleRepository(session)

    active_runs = await obj_repo.count_active()
    active_executives = await dept_repo.count({"status": "active"})
    active_specialists = await role_repo.sum_head_count_by_status("active")

    return {
        "data": {
            "status": "healthy",
            "modules": AGENT_MODULES,
            "active_agents": len(AGENT_MODULES),
            "active_executives": active_executives,
            "active_specialists": active_specialists,
            "provider": llm_client.provider_name,
            "model": llm_client.default_model,
            "active_runs": active_runs,
            # Execution is fully synchronous today — there is no background
            # job queue, so there is nothing to report a depth for.
            "queue_depth": 0,
            "pending_tasks": 0,
            "uptime_seconds": round(uptime_seconds(), 1),
            "kernel": {
                "total_calls": stats["observability"]["total_calls"],
                "cache_hit_rate": stats["cache"]["hit_rate"],
                "total_cost": stats["total_cost"],
                "tokens_used": stats["token_usage"]["total"],
            },
        }
    }


@router.get("/organization")
async def health_organization(session: AsyncSession = Depends(get_session)) -> dict:
    obj_repo = ObjectiveRepository(session)
    dept_repo = DepartmentRepository(session)
    role_repo = RoleRepository(session)
    decision_repo = DecisionRepository(session)

    objective_counts = await obj_repo.count_by_status()
    active_objectives = await obj_repo.count_active()
    active_departments = await dept_repo.count({"status": "active"})
    active_specialists = await role_repo.sum_head_count_by_status("active")
    decision_counts = await decision_repo.count_by_status()

    return {
        "data": {
            "status": "healthy",
            "active_objectives": active_objectives,
            "active_departments": active_departments,
            "active_specialists": active_specialists,
            "pending_decisions": decision_counts.get("PENDING", 0),
            "completed_objectives": objective_counts.get("completed", 0),
            "failed_objectives": objective_counts.get("failed", 0),
        }
    }
