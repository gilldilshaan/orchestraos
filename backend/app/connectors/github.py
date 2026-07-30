from __future__ import annotations

from typing import Any

import httpx

from app.connectors import BaseConnector, ConnectorRegistry


@ConnectorRegistry.register
class GitHubConnector(BaseConnector):
    provider = "github"

    def get_actions(self) -> list[dict[str, Any]]:
        return [
            {"name": "list_repos", "description": "List user/organization repositories", "params": {"org": "str (optional)"}},
            {"name": "get_repo", "description": "Get repository details", "params": {"owner": "str", "repo": "str"}},
            {"name": "create_issue", "description": "Create a new issue", "params": {"owner": "str", "repo": "str", "title": "str", "body": "str (optional)", "labels": "list (optional)"}},
            {"name": "comment_on_issue", "description": "Comment on an issue", "params": {"owner": "str", "repo": "str", "issue_number": "int", "body": "str"}},
            {"name": "list_issues", "description": "List issues for a repo", "params": {"owner": "str", "repo": "str", "state": "str (optional)"}},
            {"name": "create_pr", "description": "Create a pull request", "params": {"owner": "str", "repo": "str", "title": "str", "head": "str", "base": "str", "body": "str (optional)"}},
            {"name": "list_pull_requests", "description": "List pull requests", "params": {"owner": "str", "repo": "str", "state": "str (optional)"}},
            {"name": "list_branches", "description": "List repository branches", "params": {"owner": "str", "repo": "str"}},
            {"name": "list_commits", "description": "List recent commits", "params": {"owner": "str", "repo": "str", "per_page": "int (optional)"}},
            {"name": "list_actions", "description": "List workflow runs", "params": {"owner": "str", "repo": "str", "per_page": "int (optional)"}},
        ]

    def _base_url(self) -> str:
        return (self.config.config or {}).get("base_url", "https://api.github.com")

    def _headers(self) -> dict[str, str]:
        token = self.creds.get("token") or self.creds.get("api_key") or ""
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "OrchestraOS/1.0",
        }

    async def connect(self) -> dict[str, Any]:
        token = self.creds.get("token") or self.creds.get("api_key")
        if not token:
            return {"status": "error", "message": "No GitHub token provided"}
        return await self.health()

    async def disconnect(self) -> dict[str, Any]:
        return {"status": "disconnected", "provider": "github"}

    async def health(self) -> dict[str, Any]:
        sess = await self._ensure_session()
        try:
            resp = await sess.get(f"{self._base_url()}/user", headers=self._headers())
            if resp.status_code == 200:
                user = resp.json()
                return {"status": "connected", "user": user.get("login"), "plan": "available"}
            return {"status": "error", "code": resp.status_code, "message": resp.text[:200]}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def validate(self) -> bool:
        h = await self.health()
        return h.get("status") == "connected"

    async def execute(self, action: str, params: dict[str, Any]) -> dict[str, Any]:
        sess = await self._ensure_session()
        hdrs = self._headers()
        base = self._base_url()

        try:
            if action == "list_repos":
                org = params.get("org")
                url = f"{base}/orgs/{org}/repos" if org else f"{base}/user/repos"
                resp = await sess.get(url, headers=hdrs)
            elif action == "get_repo":
                resp = await sess.get(f"{base}/repos/{params['owner']}/{params['repo']}", headers=hdrs)
            elif action == "create_issue":
                body = {"title": params["title"]}
                if params.get("body"):
                    body["body"] = params["body"]
                if params.get("labels"):
                    body["labels"] = params["labels"]
                resp = await sess.post(f"{base}/repos/{params['owner']}/{params['repo']}/issues", headers=hdrs, json=body)
            elif action == "comment_on_issue":
                resp = await sess.post(
                    f"{base}/repos/{params['owner']}/{params['repo']}/issues/{params['issue_number']}/comments",
                    headers=hdrs, json={"body": params["body"]},
                )
            elif action == "list_issues":
                state = params.get("state", "open")
                resp = await sess.get(f"{base}/repos/{params['owner']}/{params['repo']}/issues?state={state}", headers=hdrs)
            elif action == "create_pr":
                pr_body = {"title": params["title"], "head": params["head"], "base": params["base"]}
                if params.get("body"):
                    pr_body["body"] = params["body"]
                resp = await sess.post(f"{base}/repos/{params['owner']}/{params['repo']}/pulls", headers=hdrs, json=pr_body)
            elif action == "list_pull_requests":
                state = params.get("state", "open")
                resp = await sess.get(f"{base}/repos/{params['owner']}/{params['repo']}/pulls?state={state}", headers=hdrs)
            elif action == "list_branches":
                resp = await sess.get(f"{base}/repos/{params['owner']}/{params['repo']}/branches", headers=hdrs)
            elif action == "list_commits":
                per_page = params.get("per_page", 30)
                resp = await sess.get(f"{base}/repos/{params['owner']}/{params['repo']}/commits?per_page={per_page}", headers=hdrs)
            elif action == "list_actions":
                per_page = params.get("per_page", 10)
                resp = await sess.get(f"{base}/repos/{params['owner']}/{params['repo']}/actions/runs?per_page={per_page}", headers=hdrs)
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

            if resp.status_code >= 400:
                return {"status": "error", "code": resp.status_code, "message": resp.text[:500]}
            data = resp.json()
            if isinstance(data, list):
                data = data[:50]
            return {"status": "success", "data": data}

        except httpx.HTTPError as e:
            return {"status": "error", "message": str(e)}
