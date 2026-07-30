from __future__ import annotations

from typing import Any

import httpx

from app.connectors import BaseConnector, ConnectorRegistry


@ConnectorRegistry.register
class SlackConnector(BaseConnector):
    provider = "slack"

    def get_actions(self) -> list[dict[str, Any]]:
        return [
            {"name": "list_channels", "description": "List public channels", "params": {"limit": "int (optional)"}},
            {"name": "send_message", "description": "Send message to channel", "params": {"channel": "str", "text": "str"}},
            {"name": "reply_in_thread", "description": "Reply in a thread", "params": {"channel": "str", "thread_ts": "str", "text": "str"}},
            {"name": "create_channel", "description": "Create a public channel", "params": {"name": "str", "is_private": "bool (optional)"}},
            {"name": "get_channel_history", "description": "Get recent messages", "params": {"channel": "str", "limit": "int (optional)"}},
            {"name": "send_notification", "description": "Send notification (markdown)", "params": {"channel": "str", "text": "str"}},
        ]

    def _token(self) -> str:
        return self.creds.get("token") or self.creds.get("bot_token") or ""

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token()}", "Content-Type": "application/json"}

    async def connect(self) -> dict[str, Any]:
        if not self._token():
            return {"status": "error", "message": "No Slack token provided"}
        return await self.health()

    async def disconnect(self) -> dict[str, Any]:
        return {"status": "disconnected", "provider": "slack"}

    async def health(self) -> dict[str, Any]:
        sess = await self._ensure_session()
        try:
            resp = await sess.get("https://slack.com/api/auth.test", headers=self._headers())
            data = resp.json()
            if data.get("ok"):
                return {"status": "connected", "team": data.get("team"), "user": data.get("user")}
            return {"status": "error", "message": data.get("error", resp.text[:200])}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def validate(self) -> bool:
        h = await self.health()
        return h.get("status") == "connected"

    async def execute(self, action: str, params: dict[str, Any]) -> dict[str, Any]:
        sess = await self._ensure_session()
        hdrs = self._headers()

        try:
            if action == "list_channels":
                limit = params.get("limit", 100)
                resp = await sess.get(f"https://slack.com/api/conversations.list?limit={limit}&types=public_channel", headers=hdrs)
            elif action == "send_message":
                resp = await sess.post("https://slack.com/api/chat.postMessage", headers=hdrs, json={"channel": params["channel"], "text": params["text"]})
            elif action == "reply_in_thread":
                resp = await sess.post("https://slack.com/api/chat.postMessage", headers=hdrs, json={"channel": params["channel"], "thread_ts": params["thread_ts"], "text": params["text"]})
            elif action == "create_channel":
                resp = await sess.post("https://slack.com/api/conversations.create", headers=hdrs, json={"name": params["name"], "is_private": params.get("is_private", False)})
            elif action == "get_channel_history":
                limit = params.get("limit", 10)
                resp = await sess.get(f"https://slack.com/api/conversations.history?channel={params['channel']}&limit={limit}", headers=hdrs)
            elif action == "send_notification":
                resp = await sess.post("https://slack.com/api/chat.postMessage", headers=hdrs, json={"channel": params["channel"], "text": params["text"], "mrkdwn": True})
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

            data = resp.json()
            if not data.get("ok"):
                return {"status": "error", "message": data.get("error", resp.text[:300]), "raw": data}
            return {"status": "success", "data": data}

        except httpx.HTTPError as e:
            return {"status": "error", "message": str(e)}
