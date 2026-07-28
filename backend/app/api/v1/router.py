from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    dashboard,
    decisions,
    features,
    health,
    jobs,
    objectives,
    plans,
)

router = APIRouter(prefix="/api/v1")

router.include_router(health.router, prefix="/health")
router.include_router(objectives.router)
router.include_router(plans.router)
router.include_router(dashboard.router)
router.include_router(decisions.router)
router.include_router(features.router)
router.include_router(jobs.router)
