from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    artifacts,
    connectors,
    dashboard,
    decisions,
    features,
    health,
    intelligence,
    jobs,
    metrics_agg,
    objectives,
    organizations,
    plans,
)

router = APIRouter(prefix="/api/v1")

router.include_router(health.router, prefix="/health")
router.include_router(objectives.router)
router.include_router(plans.router)
router.include_router(organizations.router)
router.include_router(dashboard.router)
router.include_router(decisions.router)
router.include_router(features.router)
router.include_router(jobs.router)
router.include_router(artifacts.router)
router.include_router(metrics_agg.router)
router.include_router(intelligence.router)
router.include_router(connectors.router)
