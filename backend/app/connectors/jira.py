from __future__ import annotations

import base64
from typing import Any

import httpx

from app.connectors import BaseConnector, ConnectorRegistry


@ConnectorRegistry.register
class JiraConnector(BaseConnector):
    provider = "jira"

    def get_actions(self) -> list[dict[str, Any]]:
        return [
            {"name": "list_projects", "description": "List accessible projects", "params": {}},
            {"name": "get_project", "description": "Get project details", "params": {"project_key": "str"}},
            {
                "name": "create_issue",
                "description": "Create a Jira issue",
                "params": {
                    "project_key": "str",
                    "summary": "str",
                    "issue_type": "str",
                    "description": "str (optional)",
                    "priority": "str (optional)",
                    "labels": "list (optional)",
                    "epic_link": "str (optional)",
                },
            },
            {"name": "get_issue", "description": "Get issue details", "params": {"issue_key": "str"}},
            {
                "name": "transition_issue",
                "description": "Transition issue status",
                "params": {"issue_key": "str", "transition_id": "str"},
            },
            {
                "name": "add_comment",
                "description": "Add comment to issue",
                "params": {"issue_key": "str", "body": "str"},
            },
            {"name": "list_epics", "description": "List epics for a project", "params": {"project_key": "str"}},
            {
                "name": "list_stories",
                "description": "List stories/tasks for a project",
                "params": {"project_key": "str", "max_results": "int (optional)"},
            },
        ]

    def _base_url(self) -> str:
        cfg = self.config.config or {}
        return str(cfg.get("base_url", "")).rstrip("/")

    def _auth(self) -> tuple[str, str]:
        email = self.creds.get("email", "")
        token = self.creds.get("token") or self.creds.get("api_key", "")
        return (email, token)

    def _basic_auth_header(self) -> dict[str, str]:
        email, token = self._auth()
        raw = f"{email}:{token}"
        encoded = base64.b64encode(raw.encode()).decode()
        return {"Authorization": f"Basic {encoded}", "Accept": "application/json"}

    async def connect(self) -> dict[str, Any]:
        if not self._base_url():
            return {"status": "error", "message": "No Jira base URL configured"}
        return await self.health()

    async def disconnect(self) -> dict[str, Any]:
        return {"status": "disconnected", "provider": "jira"}

    async def health(self) -> dict[str, Any]:
        sess = await self._ensure_session()
        try:
            resp = await sess.get(f"{self._base_url()}/rest/api/3/myself", headers=self._basic_auth_header())
            if resp.status_code == 200:
                user = resp.json()
                return {
                    "status": "connected",
                    "user": user.get("displayName", user.get("emailAddress")),
                    "account_id": user.get("accountId"),
                }
            return {"status": "error", "code": resp.status_code, "message": resp.text[:300]}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def validate(self) -> bool:
        h = await self.health()
        return h.get("status") == "connected"

    async def execute(self, action: str, params: dict[str, Any]) -> dict[str, Any]:
        sess = await self._ensure_session()
        hdrs = self._basic_auth_header()
        base = self._base_url()

        try:
            if action == "list_projects":
                resp = await sess.get(f"{base}/rest/api/3/project", headers=hdrs)
            elif action == "get_project":
                resp = await sess.get(f"{base}/rest/api/3/project/{params['project_key']}", headers=hdrs)
            elif action == "create_issue":
                fields: dict[str, Any] = {
                    "project": {"key": params["project_key"]},
                    "summary": params["summary"],
                    "issuetype": {"name": params.get("issue_type", "Task")},
                }
                if params.get("description"):
                    fields["description"] = {
                        "type": "doc",
                        "version": 1,
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": params["description"]}],
                            }
                        ],
                    }
                if params.get("priority"):
                    fields["priority"] = {"name": params["priority"]}
                if params.get("labels"):
                    fields["labels"] = params["labels"]
                resp = await sess.post(f"{base}/rest/api/3/issue", headers=hdrs, json={"fields": fields})
            elif action == "get_issue":
                resp = await sess.get(f"{base}/rest/api/3/issue/{params['issue_key']}", headers=hdrs)
            elif action == "transition_issue":
                resp = await sess.post(
                    f"{base}/rest/api/3/issue/{params['issue_key']}/transitions",
                    headers=hdrs,
                    json={"transition": {"id": params["transition_id"]}},
                )
            elif action == "add_comment":
                comment_body = {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": params["body"]}],
                        }
                    ],
                }
                resp = await sess.post(
                    f"{base}/rest/api/3/issue/{params['issue_key']}/comment",
                    headers=hdrs, json=comment_body,
                )
            elif action == "list_epics":
                resp = await sess.get(
                    f"{base}/rest/api/3/search?jql=project={params['project_key']}+AND+issuetype=Epic",
                    headers=hdrs,
                )
            elif action == "list_stories":
                max_r = params.get("max_results", 50)
                jql_url = (
                    f"{base}/rest/api/3/search?jql=project={params['project_key']}"
                    f"+AND+issuetype+in+(Story,Task)&maxResults={max_r}"
                )
                resp = await sess.get(jql_url, headers=hdrs)
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

            if resp.status_code >= 400:
                return {"status": "error", "code": resp.status_code, "message": resp.text[:500]}
            return {"status": "success", "data": resp.json()}

        except httpx.HTTPError as e:
            return {"status": "error", "message": str(e)}
