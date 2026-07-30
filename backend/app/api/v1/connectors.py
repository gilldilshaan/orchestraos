from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_session
from app.schemas import ApiResponse
from app.services.connector_orchestrator import ConnectorOrchestrator

router = APIRouter(prefix="/connectors", tags=["connectors"])


# ─── Connector CRUD ──────────────────────────────────────────


@router.post("")
async def create_connector(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.create_connector(
        provider=body["provider"],
        name=body["name"],
        auth_type=body.get("auth_type", "api_key"),
        credentials=body.get("credentials", {}),
        config=body.get("config"),
        objective_id=body.get("objective_id"),
    )
    return ApiResponse(data=result)


@router.get("")
async def list_connectors(
    objective_id: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.list_connectors(objective_id=objective_id)
    return ApiResponse(data=result)


@router.get("/{connector_id}")
async def get_connector(
    connector_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.get_connector(connector_id)
    if result is None:
        return ApiResponse(data={"error": "Connector not found"})
    return ApiResponse(data=result)


@router.delete("/{connector_id}")
async def delete_connector(
    connector_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    success = await svc.delete_connector(connector_id)
    return ApiResponse(data={"deleted": success})


# ─── Connection Management ────────────────────────────────────


@router.post("/{connector_id}/connect")
async def connect_connector(
    connector_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.connect_connector(connector_id)
    return ApiResponse(data=result)


@router.post("/{connector_id}/disconnect")
async def disconnect_connector(
    connector_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.disconnect_connector(connector_id)
    return ApiResponse(data=result)


@router.get("/{connector_id}/health")
async def check_connector_health(
    connector_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.check_health(connector_id)
    return ApiResponse(data=result)


# ─── Actions ──────────────────────────────────────────────────


@router.post("/{connector_id}/execute")
async def execute_connector_action(
    connector_id: str,
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.execute_action(
        connector_id=connector_id,
        action=body["action"],
        params=body.get("params", {}),
        objective_id=body.get("objective_id"),
        actor=body.get("actor", "system"),
    )
    return ApiResponse(data=result)


@router.get("/{connector_id}/actions")
async def list_connector_actions(
    connector_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.list_actions(connector_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


# ─── Audit Logs ────────────────────────────────────────────────


@router.get("/{connector_id}/audit")
async def list_connector_audit_logs(
    connector_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.list_audit_logs(connector_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


# ─── Webhooks ──────────────────────────────────────────────────


@router.post("/webhooks")
async def register_webhook(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.register_webhook(
        connector_id=body.get("connector_id"),
        url=body["url"],
        method=body.get("method", "POST"),
        events=body.get("events"),
        headers=body.get("headers"),
        secret=body.get("secret"),
        max_retries=body.get("max_retries", 3),
        objective_id=body.get("objective_id"),
    )
    return ApiResponse(data=result)


@router.get("/webhooks")
async def list_webhooks(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.list_webhooks()
    return ApiResponse(data=result)


# ─── Marketplace ────────────────────────────────────────────────


@router.get("/marketplace/available")
async def list_marketplace(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = ConnectorOrchestrator(session)
    result = await svc.list_marketplace()
    return ApiResponse(data=result)
