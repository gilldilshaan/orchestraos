from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session_factory
from app.kernel.ai_kernel import AIKernel
from app.models.board import BoardSession, ExecutiveMessage
from app.repositories.board_repository import (
    BoardSessionRepository,
    ExecutiveMessageRepository,
)
from app.repositories.objective_repository import ObjectiveRepository
from app.services.board_events import board_sse_manager

logger = logging.getLogger(__name__)

DEFAULT_ROSTER: list[str] = [
    "CEO",
    "Planner",
    "Engineering",
    "Finance",
    "Marketing",
    "Legal",
    "Risk",
    "Operations",
]

ROLE_PURPOSES: dict[str, str] = {
    "CEO": "Chair the board, weigh every voice, and issue the final decision.",
    "Planner": "Own execution sequencing, milestones, and delivery feasibility.",
    "Engineering": "Own technical feasibility, build capacity, and delivery risk.",
    "Finance": "Own budget adequacy, unit economics, and return on investment.",
    "Marketing": "Own market traction, adoption assumptions, and go-to-market spend.",
    "Legal": "Own compliance, regulatory exposure, and contractual liability.",
    "Risk": "Own risk exposure, uncertainty, and mitigation coverage.",
    "Operations": "Own capacity, staffing, and operational readiness.",
}

KIND_OPENING = "opening_statement"
KIND_DELIBERATION = "deliberation"
KIND_RESPONSE = "response"
KIND_VOTE = "vote"
KIND_CONSENSUS = "consensus"
KIND_SYSTEM = "system"

PHASE_LABELS: dict[str, str] = {
    "opening": "Opening statements",
    "deliberation": "Deliberation",
    "cross_exam": "Cross-examination",
    "votes": "Roll-call votes",
    "consensus": "CEO consensus",
}

BOARD_TEMPLATES: dict[str, str] = {
    KIND_OPENING: "board_opening_v1.md",
    KIND_DELIBERATION: "board_deliberation_v1.md",
    KIND_RESPONSE: "board_response_v1.md",
    KIND_VOTE: "board_vote_v1.md",
    KIND_CONSENSUS: "board_consensus_v1.md",
}

BOARD_TASK_TYPES: dict[str, str] = {
    KIND_OPENING: "board_opening",
    KIND_DELIBERATION: "board_deliberation",
    KIND_RESPONSE: "board_response",
    KIND_VOTE: "board_vote",
    KIND_CONSENSUS: "board_consensus",
}


class BoardService:
    """The Executive Collaboration Engine.

    Convenes a fixed roster of AI executives against an objective and runs a
    multi-round consensus process: opening statements -> deliberation ->
    cross-examination -> roll-call votes -> CEO consensus. Every message is
    persisted to the transcript and streamed over SSE as it completes.
    """

    def __init__(
        self,
        session: AsyncSession,
        kernel: AIKernel | None = None,
    ) -> None:
        self._session = session
        from app.kernel import ai_kernel as default_kernel

        self._kernel = kernel or default_kernel
        self._sessions = BoardSessionRepository(session)
        self._messages = ExecutiveMessageRepository(session)

    # ── Public API ───────────────────────────────────────────────────────

    async def start_board(
        self,
        objective_id: str,
        *,
        title: str | None = None,
        roster: list[str] | None = None,
        rounds: int = 3,
        launch: bool = True,
    ) -> BoardSession:
        """Create a board session and launch the consensus run in the
        background. Returns the session immediately. Set launch=False to
        create without running (used by tests to drive rounds manually)."""
        objective_id = str(objective_id)
        objective = await self._load_objective(objective_id)
        raw = objective.raw_input if objective else objective_id
        effective_roster = roster or list(DEFAULT_ROSTER)

        brief = await self._build_brief(objective_id, raw)
        session_row = BoardSession(
            objective_id=objective_id,
            title=title or f"Executive Board — {raw[:80]}",
            topic=f"Should the board approve the plan for: {raw}",
            status="running",
            roster=effective_roster,
            rounds=rounds,
            brief=brief,
        )
        created = await self._sessions.create(session_row)
        await self._session.commit()

        await self._persist_message(
            board_id=str(created.id),
            sender="system",
            kind=KIND_SYSTEM,
            round=0,
            title="Board convened",
            content=(
                f"The board has convened. {len(effective_roster)} executives "
                f"will deliberate and reach consensus."
            ),
            payload={"roster": effective_roster},
        )

        if launch:
            asyncio.get_running_loop().create_task(self._run(str(created.id)))
        return created
    async def get_session(self, board_id: str) -> BoardSession | None:
        return await self._sessions.get(board_id)

    async def list_sessions(self, *, skip: int = 0, limit: int = 100) -> list[BoardSession]:
        return await self._sessions.list_sessions(skip=skip, limit=limit)

    async def list_messages(
        self,
        board_id: str,
        *,
        skip: int = 0,
        limit: int = 500,
    ) -> list[ExecutiveMessage]:
        return await self._messages.list_by_session(board_id, skip=skip, limit=limit)

    async def get_message_count(self, board_id: str) -> int:
        return await self._messages.count_by_session(board_id)

    # ── Consensus run ────────────────────────────────────────────────────

    async def _run(self, board_id: str) -> None:
        try:
            async with async_session_factory() as session:
                service = BoardService(session, kernel=self._kernel)
                await service._run_rounds(board_id)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Board session %s failed", board_id)
            try:
                async with async_session_factory() as session:
                    repo = BoardSessionRepository(session)
                    row = await repo.get(board_id)
                    if row is not None:
                        row.status = "failed"
                        row.error = str(exc)[:1000]
                        await session.commit()
            except Exception:
                logger.exception("Failed to mark board session %s as failed", board_id)
            await board_sse_manager.emit_phase(
                board_id, "session", "error",
                message=f"Board failed: {exc}", progress=100.0,
            )

    async def _run_rounds(self, board_id: str) -> None:
        row = await self._sessions.get(board_id)
        if row is None:
            return
        roster = row.roster or list(DEFAULT_ROSTER)
        brief = row.brief or {}
        objective_raw = str(brief.get("objective", ""))

        await self._emit_phase(board_id, "opening", "started", 5.0)

        # Round 1 — openings (every executive)
        opening_msgs = await self._parallel_messages(
            row, roster, KIND_OPENING, lambda role, others: {
                "role": {"title": role, "purpose": ROLE_PURPOSES.get(role, "")},
                "objective": {"raw": objective_raw},
                "industry": brief.get("industry", ""),
                "plan_summary": brief.get("plan_summary", ""),
                "risk_summary": brief.get("risk_summary", ""),
                "board_title": row.title,
                "openings": "\n\n".join(f"{o['sender']}: {o['content']}" for o in others),
            },
        )
        await self._persist_all(board_id, opening_msgs)

        await self._emit_phase(board_id, "deliberation", "started", 30.0)

        # Round 2 — deliberation (every executive reacts to the openings)
        openings_view = [
            {
                "sender": m.sender,
                "stance": m.stance,
                "content": m.content or "",
                "payload": m.payload,
            }
            for m in opening_msgs
            if m.sender != "system"
        ]
        openings_text = "\n\n".join(
            f"{o['sender']} ({o['stance']}): {o['content']}" for o in openings_view
        )

        delib_msgs = await self._parallel_messages(
            row, roster, KIND_DELIBERATION, lambda role, _others: {
                "role": {"title": role, "purpose": ROLE_PURPOSES.get(role, "")},
                "objective": {"raw": objective_raw},
                "industry": brief.get("industry", ""),
                "plan_summary": brief.get("plan_summary", ""),
                "risk_summary": brief.get("risk_summary", ""),
                "board_title": row.title,
                "openings": openings_text,
            },
        )
        await self._persist_all(board_id, delib_msgs)

        await self._emit_phase(board_id, "cross_exam", "started", 55.0)

        # Round 3 — cross-examination (only executives who were addressed)
        addressed = {role: [] for role in roster}
        for m in delib_msgs:
            payload = m.payload or {}
            for c in payload.get("challenges", []):
                addressed.get(c.get("target", ""), []).append(
                    {"kind": "challenge", "text": c.get("point", "")}
                )
            for q in payload.get("questions", []):
                addressed.get(q.get("target", ""), []).append(
                    {"kind": "question", "text": q.get("question", "")}
                )

        response_msgs: list[ExecutiveMessage] = []
        for role, items in addressed.items():
            if not items:
                continue
            if role not in roster:
                continue
            msg = await self._generate_message(
                row,
                KIND_RESPONSE,
                {
                    "role": {"title": role, "purpose": ROLE_PURPOSES.get(role, "")},
                    "board_title": row.title,
                    "targets": "\n".join(
                        f"- [{i['kind']}] {i['text']}" for i in items
                    ),
                },
            )
            if msg is not None:
                response_msgs.append(msg)
        await self._persist_all(board_id, response_msgs)

        await self._emit_phase(board_id, "votes", "started", 75.0)

        # Round 4 — roll-call votes (every executive)
        transcript = self._transcript_for_vote(
            opening_msgs + delib_msgs + response_msgs
        )
        vote_msgs = await self._parallel_messages(
            row, roster, KIND_VOTE, lambda role, _others: {
                "role": {"title": role, "purpose": ROLE_PURPOSES.get(role, "")},
                "objective": {"raw": objective_raw},
                "industry": brief.get("industry", ""),
                "board_title": row.title,
                "transcript": transcript,
            },
        )
        await self._persist_all(board_id, vote_msgs)

        await self._emit_phase(board_id, "consensus", "started", 90.0)

        # Round 5 — CEO consensus synthesis
        votes_text = "\n\n".join(
            f"{m.sender}: vote={m.stance or (m.payload or {}).get('vote', '?')} — {m.content or ''}"
            for m in vote_msgs
            if m.sender != "system"
        )
        try:
            consensus = await self._generate_message(
                row,
                KIND_CONSENSUS,
                {
                    "role": {"title": "CEO", "purpose": ROLE_PURPOSES["CEO"]},
                    "board_title": row.title,
                    "objective": {"raw": objective_raw},
                    "votes": votes_text,
                },
            )
        except Exception as exc:
            logger.warning("Consensus generation failed: %s", exc)
            consensus = ExecutiveMessage(
                board_session_id=row.id,
                sender="CEO",
                kind=KIND_CONSENSUS,
                round=row.rounds,
                title="Consensus unavailable",
                content="The CEO could not reach consensus due to an error.",
                payload={"error": str(exc)[:300]},
            )
        if consensus is not None:
            await self._persist_all(board_id, [consensus])

        # Finalize the session
        await self._finalize(row, vote_msgs, consensus)

    # ── Round machinery ──────────────────────────────────────────────────

    async def _parallel_messages(
        self,
        row: BoardSession,
        roster: list[str],
        kind: str,
        build_context: Any,
    ) -> list[ExecutiveMessage]:
        tasks = [
            self._generate_message(row, kind, build_context(role, []))
            for role in roster
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        messages: list[ExecutiveMessage] = []
        for role, res in zip(roster, results, strict=True):
            if isinstance(res, Exception):
                logger.warning("Board message failed for %s in %s: %s", role, kind, res)
                messages.append(
                    ExecutiveMessage(
                        board_session_id=row.id,
                        sender=role,
                        kind=kind,
                        round=row.rounds,
                        title=f"{role} unavailable",
                        content=f"{role} could not respond to this round.",
                        payload={"error": str(res)[:300]},
                    )
                )
            elif res is not None:
                messages.append(res)
        return messages

    async def _generate_message(
        self,
        row: BoardSession,
        kind: str,
        context: dict[str, Any],
    ) -> ExecutiveMessage | None:
        result = await self._kernel.run(
            task_type=BOARD_TASK_TYPES[kind],
            prompt_template=BOARD_TEMPLATES[kind],
            context=context,
            temperature=0.6,
            use_cache=False,
        )
        if not isinstance(result, dict) or not result.get("title"):
            logger.warning("Empty board response for kind=%s", kind)
            return None

        content = result.get("summary") or result.get("decision") or result.get("reasoning") or ""
        stance = (
            result.get("stance")
            or result.get("stance_now")
            or result.get("verdict")
        )
        if kind == KIND_VOTE:
            stance = result.get("vote") or stance

        payload = {k: v for k, v in result.items() if k not in {"title", "summary", "stance", "confidence"}}
        return ExecutiveMessage(
            board_session_id=row.id,
            sender=context.get("role", {}).get("title", "board"),
            recipient=None,
            kind=kind,
            round=row.rounds,
            title=str(result["title"])[:200],
            content=content,
            stance=stance,
            confidence=result.get("confidence"),
            payload=payload,
        )

    async def _persist_all(
        self,
        board_id: str,
        messages: list[ExecutiveMessage],
    ) -> None:
        for m in messages:
            await self._messages.create(m)
        await self._session.commit()
        for m in messages:
            await board_sse_manager.emit_message(board_id, self._message_dict(m))

    async def _persist_message(
        self,
        board_id: str,
        sender: str,
        kind: str,
        round: int,
        title: str,
        content: str,
        payload: dict[str, Any] | None = None,
        stance: str | None = None,
        confidence: float | None = None,
    ) -> ExecutiveMessage:
        m = ExecutiveMessage(
            board_session_id=board_id,
            sender=sender,
            kind=kind,
            round=round,
            title=title,
            content=content,
            stance=stance,
            confidence=confidence,
            payload=payload,
        )
        await self._messages.create(m)
        await self._session.commit()
        await board_sse_manager.emit_message(board_id, self._message_dict(m))
        return m

    def _transcript_for_vote(self, messages: list[ExecutiveMessage]) -> str:
        lines: list[str] = []
        for m in messages:
            if m.sender == "system":
                continue
            lines.append(f"{m.sender} [{m.kind}]: {m.content or ''}")
        return "\n\n".join(lines)

    # ── Finalization ─────────────────────────────────────────────────────

    async def _finalize(
        self,
        row: BoardSession,
        vote_msgs: list[ExecutiveMessage],
        consensus: ExecutiveMessage | None,
    ) -> None:
        roll_call: list[dict[str, Any]] = []
        counts: dict[str, int] = {"approve": 0, "conditional": 0, "abstain": 0, "reject": 0}
        conflicts: list[dict[str, Any]] = []

        for m in vote_msgs:
            if m.sender == "system":
                continue
            vote = m.stance or "abstain"
            counts[vote] = counts.get(vote, 0) + 1
            payload = m.payload or {}
            roll_call.append({
                "role": m.sender,
                "vote": vote,
                "stance": payload.get("stance", ""),
                "confidence": m.confidence,
                "conditions": payload.get("conditions", []),
                "reasoning": payload.get("reasoning", ""),
            })
            if vote == "reject":
                conflicts.append({
                    "title": f"{m.sender} rejected the initiative",
                    "parties": [m.sender],
                    "severity": "high",
                    "status": "open",
                    "details": payload.get("reasoning", ""),
                })
            elif vote == "conditional":
                conflicts.append({
                    "title": f"{m.sender} attached conditions to approval",
                    "parties": [m.sender],
                    "severity": "medium",
                    "status": "open",
                    "details": "; ".join(payload.get("conditions", [])),
                })

        verdict = consensus.stance if consensus else "conditional"
        mood = "consensus"
        if counts.get("reject", 0) > 0 and counts.get("approve", 0) > 0:
            mood = "stalemate"
        elif counts.get("reject", 0) > 0:
            mood = "divided"

        consensus_payload = consensus.payload if consensus else {}
        row.result = {
            "verdict": verdict,
            "mood": mood,
            "decision": consensus.content if consensus else "",
            "rationale": consensus_payload.get("rationale", ""),
            "action_items": consensus_payload.get("action_items", []),
            "adopted_conditions": consensus_payload.get("adopted_conditions", []),
            "minority_reports": consensus_payload.get("minority_reports", []),
            "overall_confidence": consensus.confidence if consensus else None,
            "roll_call": roll_call,
            "counts": counts,
            "conflicts": conflicts,
            "completed_at": None,
        }
        row.status = "completed"
        await self._session.commit()
        await board_sse_manager.emit_phase(
            row.id, "session", "completed",
            message=f"Board completed with verdict: {verdict}",
            progress=100.0,
        )

    # ── Helpers ──────────────────────────────────────────────────────────

    async def _load_objective(self, objective_id: str) -> Any | None:
        repo = ObjectiveRepository(self._session)
        return await repo.get(objective_id)

    async def _build_brief(self, objective_id: str, raw: str) -> dict[str, Any]:
        brief: dict[str, Any] = {
            "objective": raw,
            "company": "OrchestraOS",
            "industry": "technology_software",
            "plan_summary": "",
            "risk_summary": "",
        }
        try:
            from app.repositories.extensions_repository import (
                PlanRepository,
                RiskRepository,
            )

            plan_repo = PlanRepository(self._session)
            plan = await plan_repo.get_active_plan(objective_id)
            if plan is not None:
                brief["plan_summary"] = (
                    plan.description
                    or f"Plan {plan.name} (status: {plan.status})"
                )

            risk_repo = RiskRepository(self._session)
            risks = await risk_repo.list_by_objective(objective_id)
            if risks:
                brief["risk_summary"] = "; ".join(
                    f"{r.title} ({r.risk_level})" for r in risks[:5]
                )
        except Exception:
            logger.debug("No plan/risk context available for board %s", objective_id)
        return brief

    async def _emit_phase(self, board_id: str, phase: str, status: str, progress: float) -> None:
        await board_sse_manager.emit_phase(
            board_id,
            phase,
            status,
            message=PHASE_LABELS.get(phase, phase),
            progress=progress,
        )

    @staticmethod
    def _message_dict(m: ExecutiveMessage) -> dict[str, Any]:
        return {
            "id": str(m.id),
            "board_session_id": str(m.board_session_id),
            "sender": m.sender,
            "recipient": m.recipient,
            "kind": m.kind,
            "round": m.round,
            "title": m.title,
            "content": m.content,
            "stance": m.stance,
            "confidence": m.confidence,
            "payload": m.payload,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
