from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.dependencies import get_redis_health
from app.database.session import check_database_health

router = APIRouter(tags=["Health"])


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
async def health_ai() -> dict:
    from app.kernel import ai_kernel

    stats = ai_kernel.get_stats()
    return {
        "data": {
            "status": "healthy",
            "modules": [
                "objective_compiler", "planner", "risk_analyzer",
                "organization_generator", "decision_engine",
                "devils_advocate", "readiness", "bottleneck",
            ],
            "active_agents": 8,
            "pending_tasks": 0,
            "kernel": {
                "total_calls": stats["observability"]["total_calls"],
                "cache_hit_rate": stats["cache"]["hit_rate"],
                "total_cost": stats["total_cost"],
                "tokens_used": stats["token_usage"]["total"],
            },
        }
    }


@router.get("/organization")
async def health_organization() -> dict:
    return {
        "data": {
            "status": "healthy",
            "metrics": {
                "execution_score": None,
                "coordination_score": None,
                "risk_index": None,
                "trust_score": None,
                "decision_quality": None,
            },
            "active_objectives": 0,
            "active_departments": 0,
            "pending_decisions": 0,
        }
    }
