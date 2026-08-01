from __future__ import annotations

from typing import Any

import httpx

from app.connectors import BaseConnector, ConnectorRegistry


@ConnectorRegistry.register
class NotionConnector(BaseConnector):
    provider = "notion"

    def get_actions(self) -> list[dict[str, Any]]:
        return [
            {"name": "list_databases", "description": "List accessible databases", "params": {}},
            {
                "name": "create_page",
                "description": "Create a new page",
                "params": {"parent_id": "str", "title": "str", "content": "list (optional)"},
            },
            {
                "name": "update_page",
                "description": "Update page properties",
                "params": {"page_id": "str", "properties": "dict"},
            },
            {"name": "get_page", "description": "Get page content", "params": {"page_id": "str"}},
            {
                "name": "search",
                "description": "Search workspace",
                "params": {"query": "str", "limit": "int (optional)"},
            },
            {
                "name": "append_blocks",
                "description": "Append content blocks",
                "params": {"block_id": "str", "children": "list"},
            },
            {
                "name": "store_report",
                "description": "Store a report as a page",
                "params": {"database_id": "str", "title": "str", "content": "str"},
            },
        ]

    def _token(self) -> str:
        return self.creds.get("token") or self.creds.get("api_key") or ""

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token()}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        }

    async def connect(self) -> dict[str, Any]:
        if not self._token():
            return {"status": "error", "message": "No Notion token provided"}
        return await self.health()

    async def disconnect(self) -> dict[str, Any]:
        return {"status": "disconnected", "provider": "notion"}

    async def health(self) -> dict[str, Any]:
        sess = await self._ensure_session()
        try:
            resp = await sess.get("https://api.notion.com/v1/users/me", headers=self._headers())
            if resp.status_code == 200:
                user = resp.json()
                return {"status": "connected", "user": user.get("name", user.get("id"))}
            return {"status": "error", "code": resp.status_code, "message": resp.text[:300]}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def validate(self) -> bool:
        h = await self.health()
        return h.get("status") == "connected"

    async def execute(self, action: str, params: dict[str, Any]) -> dict[str, Any]:
        sess = await self._ensure_session()
        hdrs = self._headers()

        try:
            if action == "list_databases":
                resp = await sess.post(
                    "https://api.notion.com/v1/search",
                    headers=hdrs,
                    json={"filter": {"value": "database", "property": "object"}},
                )
            elif action == "create_page":
                parent_type = "database_id" if params.get("database_id") else "page_id"
                parent_id = params.get("database_id") or params.get("parent_id", "")
                body: dict[str, Any] = {
                    "parent": {parent_type.replace("_id", "_id"): parent_id},
                    "properties": {
                        "title": {
                            "title": [{"type": "text", "text": {"content": params.get("title", "")}}]
                        }
                    },
                }
                if params.get("content"):
                    body["children"] = self._parse_blocks(params["content"])
                resp = await sess.post("https://api.notion.com/v1/pages", headers=hdrs, json=body)
            elif action == "update_page":
                resp = await sess.patch(
                    f"https://api.notion.com/v1/pages/{params['page_id']}",
                    headers=hdrs,
                    json={"properties": params["properties"]},
                )
            elif action == "get_page":
                resp = await sess.get(f"https://api.notion.com/v1/pages/{params['page_id']}", headers=hdrs)
            elif action == "search":
                limit = params.get("limit", 10)
                resp = await sess.post(
                    "https://api.notion.com/v1/search",
                    headers=hdrs,
                    json={"query": params["query"], "page_size": limit},
                )
            elif action == "append_blocks":
                resp = await sess.patch(
                    f"https://api.notion.com/v1/blocks/{params['block_id']}/children",
                    headers=hdrs,
                    json={"children": params["children"]},
                )
            elif action == "store_report":
                db_id = params.get("database_id", "")
                body = {
                    "parent": {"database_id": db_id},
                    "properties": {
                        "title": {
                            "title": [
                                {"type": "text", "text": {"content": params.get("title", "Report")}}
                            ]
                        }
                    },
                    "children": [
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [
                                    {"type": "text", "text": {"content": params.get("content", "")}}
                                ]
                            },
                        }
                    ],
                }
                resp = await sess.post("https://api.notion.com/v1/pages", headers=hdrs, json=body)
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

            if resp.status_code >= 400:
                return {"status": "error", "code": resp.status_code, "message": resp.text[:500]}
            return {"status": "success", "data": resp.json()}

        except httpx.HTTPError as e:
            return {"status": "error", "message": str(e)}

    def _parse_blocks(self, content: list[dict[str, Any]]) -> list[dict[str, Any]]:
        blocks: list[dict[str, Any]] = []
        for item in content:
            if isinstance(item, str):
                blocks.append(
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {"rich_text": [{"type": "text", "text": {"content": item}}]},
                    }
                )
            elif isinstance(item, dict):
                blocks.append(item)
        return blocks
