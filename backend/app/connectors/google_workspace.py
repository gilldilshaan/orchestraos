from __future__ import annotations

from typing import Any

import httpx

from app.connectors import BaseConnector, ConnectorRegistry


@ConnectorRegistry.register
class GoogleWorkspaceConnector(BaseConnector):
    provider = "google_workspace"

    def get_actions(self) -> list[dict[str, Any]]:
        return [
            {"name": "create_doc", "description": "Create a Google Doc", "params": {"title": "str", "content": "str (optional)"}},
            {"name": "create_sheet", "description": "Create a Google Sheet", "params": {"title": "str", "headers": "list (optional)"}},
            {"name": "append_to_sheet", "description": "Append rows to sheet", "params": {"spreadsheet_id": "str", "range": "str", "values": "list"}},
            {"name": "list_drive_files", "description": "List Drive files", "params": {"query": "str (optional)", "page_size": "int (optional)"}},
            {"name": "create_calendar_event", "description": "Create calendar event", "params": {"summary": "str", "start": "str", "end": "str", "description": "str (optional)"}},
            {"name": "send_email", "description": "Send email via Gmail", "params": {"to": "str", "subject": "str", "body": "str"}},
        ]

    def _token(self) -> str:
        return self.creds.get("token") or self.creds.get("access_token") or ""

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token()}", "Content-Type": "application/json"}

    async def connect(self) -> dict[str, Any]:
        if not self._token():
            return {"status": "error", "message": "No Google token provided"}
        return await self.health()

    async def disconnect(self) -> dict[str, Any]:
        return {"status": "disconnected", "provider": "google_workspace"}

    async def health(self) -> dict[str, Any]:
        sess = await self._ensure_session()
        try:
            resp = await sess.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=self._headers())
            if resp.status_code == 200:
                user = resp.json()
                return {"status": "connected", "user": user.get("email", user.get("name"))}
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
            if action == "create_doc":
                body = {"title": params.get("title", "Untitled"), "content": params.get("content", "")}
                resp = await sess.post("https://docs.googleapis.com/v1/documents", headers=hdrs, json=body)
            elif action == "create_sheet":
                body = {"properties": {"title": params.get("title", "Untitled")}}
                if params.get("headers"):
                    body["sheets"] = [{"properties": {"title": "Sheet1"}}]
                resp = await sess.post("https://sheets.googleapis.com/v4/spreadsheets", headers=hdrs, json=body)
                if resp.status_code == 200 and params.get("headers"):
                    data = resp.json()
                    sid = data.get("spreadsheetId", "")
                    values = [params["headers"]]
                    await sess.put(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/A1?valueInputOption=RAW", headers=hdrs, json={"values": values})
            elif action == "append_to_sheet":
                resp = await sess.post(f"https://sheets.googleapis.com/v4/spreadsheets/{params['spreadsheet_id']}/values/{params.get('range', 'A1')}:append?valueInputOption=RAW", headers=hdrs, json={"values": params["values"]})
            elif action == "list_drive_files":
                q = params.get("query", "")
                page = params.get("page_size", 20)
                url = f"https://www.googleapis.com/drive/v3/files?pageSize={page}"
                if q:
                    url += f"&q={q}"
                resp = await sess.get(url, headers=hdrs)
            elif action == "create_calendar_event":
                body = {"summary": params["summary"], "start": {"dateTime": params["start"]}, "end": {"dateTime": params["end"]}}
                if params.get("description"):
                    body["description"] = params["description"]
                resp = await sess.post("https://www.googleapis.com/calendar/v3/calendars/primary/events", headers=hdrs, json=body)
            elif action == "send_email":
                import base64 as b64

                message = f"From: me\r\nTo: {params['to']}\r\nSubject: {params['subject']}\r\n\r\n{params['body']}"
                encoded = b64.urlsafe_b64encode(message.encode()).decode()
                resp = await sess.post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", headers=hdrs, json={"raw": encoded})
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

            if resp.status_code >= 400:
                return {"status": "error", "code": resp.status_code, "message": resp.text[:500]}
            return {"status": "success", "data": resp.json()}

        except httpx.HTTPError as e:
            return {"status": "error", "message": str(e)}
