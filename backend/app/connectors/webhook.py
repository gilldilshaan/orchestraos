from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

import httpx

from app.connectors import BaseConnector, ConnectorRegistry


@ConnectorRegistry.register
class WebhookEngine(BaseConnector):
    provider = "webhook"

    def get_actions(self) -> list[dict[str, Any]]:
        return [
            {"name": "post", "description": "Send HTTP POST", "params": {"url": "str", "body": "any", "headers": "dict (optional)"}},
            {"name": "put", "description": "Send HTTP PUT", "params": {"url": "str", "body": "any", "headers": "dict (optional)"}},
            {"name": "patch", "description": "Send HTTP PATCH", "params": {"url": "str", "body": "any", "headers": "dict (optional)"}},
            {"name": "delete", "description": "Send HTTP DELETE", "params": {"url": "str", "headers": "dict (optional)"}},
            {"name": "get", "description": "Send HTTP GET", "params": {"url": "str", "headers": "dict (optional)"}},
        ]

    async def connect(self) -> dict[str, Any]:
        return {"status": "connected", "message": "Webhook engine ready"}

    async def disconnect(self) -> dict[str, Any]:
        return {"status": "disconnected", "provider": "webhook"}

    async def health(self) -> dict[str, Any]:
        return {"status": "connected", "provider": "webhook"}

    async def validate(self) -> bool:
        return True

    def _sign(self, body: bytes, secret: str) -> str:
        return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    async def _send(
        self, method: str, url: str, body: Any = None, headers: dict[str, str] | None = None
    ) -> dict[str, Any]:
        sess = await self._ensure_session()
        hdrs = dict(headers or {})
        hdrs.setdefault("Content-Type", "application/json")
        hdrs.setdefault("User-Agent", "OrchestraOS-Webhook/1.0")

        secret = self.creds.get("secret", "")
        if secret and body is not None:
            payload = json.dumps(body).encode() if not isinstance(body, bytes) else body
            hdrs["X-Signature-256"] = self._sign(payload, secret)

        try:
            resp = await sess.request(method, url, json=body if body is not None else None, headers=hdrs)
            return {
                "status": "success" if resp.status_code < 400 else "error",
                "code": resp.status_code,
                "body": resp.text[:2000],
                "headers": dict(resp.headers),
            }
        except httpx.HTTPError as e:
            return {"status": "error", "message": str(e)}

    async def execute(self, action: str, params: dict[str, Any]) -> dict[str, Any]:
        method = action.upper()
        if method not in ("POST", "PUT", "PATCH", "DELETE", "GET"):
            return {"status": "error", "message": f"Unsupported method: {action}"}

        url = params.get("url", "")
        if not url:
            return {"status": "error", "message": "URL is required"}

        body = params.get("body")
        headers = params.get("headers")
        return await self._send(method, url, body, headers)
