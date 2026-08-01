from __future__ import annotations

import time
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors import BaseConnector, ConnectorRegistry
from app.models.connectors import (
    ConnectorAction,
    ConnectorAuditLog,
    ConnectorConfig,
    ConnectorWebhook,
)
from app.repositories.connector_repository import (
    ConnectorActionRepository,
    ConnectorAuditLogRepository,
    ConnectorConfigRepository,
    ConnectorWebhookRepository,
)
from app.repositories.extensions_repository import (
    AgentTelemetryRepository,
    StoredExecutionEventRepository,
)
from app.utils.encryption import encrypt_credentials


class ConnectorOrchestrator:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._config_repo = ConnectorConfigRepository(session)
        self._action_repo = ConnectorActionRepository(session)
        self._webhook_repo = ConnectorWebhookRepository(session)
        self._audit_repo = ConnectorAuditLogRepository(session)
        self._event_repo = StoredExecutionEventRepository(session)
        self._telemetry_repo = AgentTelemetryRepository(session)

    async def create_connector(
        self,
        provider: str,
        name: str,
        auth_type: str,
        credentials: dict[str, Any],
        config: dict[str, Any] | None = None,
        objective_id: str | None = None,
    ) -> dict[str, Any]:
        encrypted = encrypt_credentials(credentials)
        conn = ConnectorConfig(
            objective_id=objective_id,
            provider=provider,
            name=name,
            auth_type=auth_type,
            credentials_encrypted=encrypted,
            config=config or {},
            status="disconnected",
        )
        created = await self._config_repo.create(conn)
        return {
            "id": created.id,
            "provider": created.provider,
            "name": created.name,
            "auth_type": created.auth_type,
            "status": created.status,
            "objective_id": created.objective_id,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def get_connector(self, connector_id: str) -> dict[str, Any] | None:
        c = await self._config_repo.get(connector_id)
        if not c:
            return None
        return {
            "id": c.id,
            "provider": c.provider,
            "name": c.name,
            "auth_type": c.auth_type,
            "status": c.status,
            "health_status": c.health_status,
            "last_health_check": c.last_health_check.isoformat() if c.last_health_check else None,
            "config": c.config,
            "metadata": c.metadata,
            "objective_id": c.objective_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }

    async def list_connectors(
        self, objective_id: str | None = None
    ) -> list[dict[str, Any]]:
        if objective_id:
            conns = await self._config_repo.list_by_objective(objective_id)
        else:
            conns = await self._config_repo.list()
        return [
            {
                "id": c.id,
                "provider": c.provider,
                "name": c.name,
                "auth_type": c.auth_type,
                "status": c.status,
                "health_status": c.health_status,
                "objective_id": c.objective_id,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in conns
        ]

    async def delete_connector(self, connector_id: str) -> bool:
        return await self._config_repo.soft_delete(connector_id)

    async def connect_connector(self, connector_id: str) -> dict[str, Any]:
        c = await self._config_repo.get(connector_id)
        if not c:
            return {"status": "error", "message": "Connector not found"}
        instance = self._build_instance(c)
        try:
            result = await instance.connect()
            status = "connected" if result.get("status") == "connected" else "error"
            await self._config_repo.update_status(connector_id, status, status)
            await self._audit("system", connector_id, "connect", f"connector:{c.provider}", status, result)
            return {"connector_id": connector_id, "status": status, "detail": result}
        except Exception as e:
            await self._config_repo.update_status(connector_id, "error", "error")
            return {"status": "error", "message": str(e)}
        finally:
            await instance.close()

    async def disconnect_connector(self, connector_id: str) -> dict[str, Any]:
        c = await self._config_repo.get(connector_id)
        if not c:
            return {"status": "error", "message": "Connector not found"}
        instance = self._build_instance(c)
        try:
            result = await instance.disconnect()
            await self._config_repo.update_status(connector_id, "disconnected", None)
            await self._audit("system", connector_id, "disconnect", f"connector:{c.provider}", "success", result)
            return {"connector_id": connector_id, "status": "disconnected"}
        finally:
            await instance.close()

    async def check_health(self, connector_id: str) -> dict[str, Any]:
        c = await self._config_repo.get(connector_id)
        if not c:
            return {"status": "error", "message": "Connector not found"}
        instance = self._build_instance(c)
        try:
            result = await instance.health()
            health = result.get("status", "error")
            await self._config_repo.update_status(
                connector_id, "connected" if health == "connected" else "error", health
            )
            return {"connector_id": connector_id, "health": result}
        except Exception as e:
            await self._config_repo.update_status(connector_id, "error", "error")
            return {"status": "error", "message": str(e)}
        finally:
            await instance.close()

    async def execute_action(
        self,
        connector_id: str,
        action: str,
        params: dict[str, Any],
        objective_id: str | None = None,
        actor: str = "system",
    ) -> dict[str, Any]:
        c = await self._config_repo.get(connector_id)
        if not c:
            return {"status": "error", "message": "Connector not found"}

        action_record = ConnectorAction(
            connector_id=connector_id,
            objective_id=objective_id or c.objective_id,
            action=action,
            params=params,
            status="pending",
            started_at=datetime.now(),
        )
        action_record = await self._action_repo.create(action_record)
        action_id = action_record.id
        start = time.monotonic()

        instance = self._build_instance(c)
        try:
            result = await instance.execute(action, params)
            elapsed = time.monotonic() - start
            action_status = "success" if result.get("status") == "success" else "failed"
            await self._action_repo.update(action_id, {
                "status": action_status,
                "result": result,
                "completed_at": datetime.now(),
                "duration_ms": round(elapsed * 1000, 2),
            })
            await self._generate_event(
                objective_id or c.objective_id or "", action, action_status, f"{c.provider}/{action}"
            )
            await self._generate_telemetry(
                objective_id or c.objective_id or "", c.provider, action, action_status, elapsed
            )
            await self._audit(actor, connector_id, action, f"{c.provider}:{action}", action_status, result, action_id)
            await self._deliver_webhooks(c, action, result)
            return {"action_id": action_id, "status": action_status, "result": result}
        except Exception as e:
            elapsed = time.monotonic() - start
            await self._action_repo.update(action_id, {
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.now(),
                "duration_ms": round(elapsed * 1000, 2),
            })
            return {"action_id": action_id, "status": "failed", "error": str(e)}
        finally:
            await instance.close()

    async def list_actions(
        self, connector_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        actions = await self._action_repo.list_by_connector(connector_id, skip=skip, limit=limit)
        return [
            {
                "id": a.id,
                "connector_id": a.connector_id,
                "action": a.action,
                "params": a.params,
                "status": a.status,
                "error": a.error,
                "duration_ms": a.duration_ms,
                "retry_count": a.retry_count,
                "started_at": a.started_at.isoformat() if a.started_at else None,
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in actions
        ]

    async def list_audit_logs(
        self, connector_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        logs = await self._audit_repo.list_by_connector(connector_id, skip=skip, limit=limit)
        return [
            {
                "id": log.id,
                "connector_id": log.connector_id,
                "action": log.action,
                "actor": log.actor,
                "target": log.target,
                "result": log.result,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]

    async def register_webhook(
        self,
        connector_id: str | None,
        url: str,
        method: str = "POST",
        events: list[str] | None = None,
        headers: dict[str, str] | None = None,
        secret: str | None = None,
        max_retries: int = 3,
        objective_id: str | None = None,
    ) -> dict[str, Any]:
        wh = ConnectorWebhook(
            connector_id=connector_id,
            objective_id=objective_id,
            url=url,
            method=method,
            headers=headers,
            events=events,
            secret=secret,
            max_retries=max_retries,
        )
        created = await self._webhook_repo.create(wh)
        return {
            "id": created.id,
            "url": created.url,
            "method": created.method,
            "events": created.events,
            "active": created.active,
            "created_at": created.created_at.isoformat() if created.created_at else None,
        }

    async def list_webhooks(self) -> list[dict[str, Any]]:
        whs = await self._webhook_repo.list_active()
        return [
            {
                "id": w.id,
                "connector_id": w.connector_id,
                "url": w.url,
                "method": w.method,
                "events": w.events,
                "active": w.active,
                "last_delivery": w.last_delivery.isoformat() if w.last_delivery else None,
                "last_status": w.last_status,
            }
            for w in whs
        ]

    async def list_marketplace(self) -> list[dict[str, Any]]:
        return ConnectorRegistry.get_action_definitions()

    async def _deliver_webhooks(self, config: ConnectorConfig, action: str, result: dict[str, Any]) -> None:
        whs = await self._webhook_repo.list_by_connector(config.id)
        for wh in whs:
            if not wh.active:
                continue
            if wh.events and action not in wh.events:
                continue
            import httpx

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.request(
                        wh.method,
                        wh.url,
                        json={"provider": config.provider, "action": action, "result": result},
                        headers=dict(wh.headers or {}),
                    )
                status = "success" if resp.status_code < 400 else "failed"
                await self._webhook_repo.record_delivery(wh.id, status, resp.text[:1000])
            except Exception:
                await self._webhook_repo.record_delivery(wh.id, "failed", "delivery_error")

    async def _audit(
        self,
        actor: str,
        connector_id: str,
        action: str,
        target: str,
        result: str,
        details: dict[str, Any] | None = None,
        action_id: str | None = None,
    ) -> None:
        log = ConnectorAuditLog(
            connector_id=connector_id,
            action_id=action_id,
            action=action,
            actor=actor,
            target=target,
            result=result,
            details=details,
        )
        await self._audit_repo.create(log)

    async def _generate_event(
        self, objective_id: str, stage: str, status: str, message: str
    ) -> None:
        from app.models.extensions import StoredExecutionEvent

        events = await self._event_repo.list()
        ev = StoredExecutionEvent(
            objective_id=objective_id,
            stage=stage,
            status=status,
            message=message,
            event_order=len(events) + 1,
        )
        await self._event_repo.create(ev)

    async def _generate_telemetry(
        self, objective_id: str, agent_id: str, stage: str, status: str, duration: float
    ) -> None:
        from app.models.extensions import AgentTelemetry

        tel = AgentTelemetry(
            objective_id=objective_id,
            agent_id=agent_id,
            agent_name=f"connector:{agent_id}",
            stage=stage,
            status=status,
            runtime_ms=round(duration * 1000, 2),
            role="connector",
        )
        await self._telemetry_repo.create(tel)

    def _build_instance(self, config: ConnectorConfig) -> BaseConnector:
        cls = ConnectorRegistry.get(config.provider)
        if not cls:
            raise ValueError(f"Unknown connector provider: {config.provider}")
        return cls(config)
