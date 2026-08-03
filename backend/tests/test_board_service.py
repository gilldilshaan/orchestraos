from __future__ import annotations

import copy
from typing import Any

import pytest

from app.kernel.ai_kernel import AIKernel
from app.models.objective import Objective
from app.repositories.objective_repository import ObjectiveRepository
from app.services.board_service import (
    DEFAULT_ROSTER,
    KIND_CONSENSUS,
    KIND_DELIBERATION,
    KIND_OPENING,
    KIND_RESPONSE,
    KIND_SYSTEM,
    KIND_VOTE,
    ROLE_PURPOSES,
    BoardService,
)

pytestmark = pytest.mark.integration


class FakeKernel:
    """Deterministic LLM stand-in. Returns canned structured outputs per
    task type, mirroring the JSON contracts of the board prompt templates."""

    def __init__(self, overrides: dict[str, Any] | None = None) -> None:
        self._overrides = overrides or {}
        self.calls: list[dict[str, Any]] = []

    async def run(self, task_type: str, **kwargs: Any) -> dict[str, Any]:
        self.calls.append({"task_type": task_type, **kwargs})
        default = self._defaults()[task_type]
        override = self._overrides.get(task_type)
        if callable(override):
            return copy.deepcopy(override(kwargs))
        return copy.deepcopy(override if override is not None else default)

    def _defaults(self) -> dict[str, dict[str, Any]]:
        return {
            "board_opening": {
                "title": "Opening",
                "summary": "The objective is achievable with conditions.",
                "stance": "conditional",
                "key_points": ["Clear objective", "Needs budget detail"],
                "concerns": ["Budget unstated"],
                "questions": ["What is the budget?"],
                "confidence": 0.6,
            },
            "board_deliberation": {
                "title": "Deliberation",
                "summary": "I agree with the direction but challenge the budget.",
                "stance_now": "conditional",
                "agreements": ["Direction is sound"],
                "challenges": [
                    {"target": "Finance", "point": "Budget needs contingency"}
                ],
                "questions": [
                    {"target": "Finance", "question": "What is the contingency?"}
                ],
                "conditions": ["Add contingency"],
                "confidence": 0.55,
            },
            "board_response": {
                "title": "Response",
                "summary": "I concede the contingency point.",
                "answers": [
                    {"question": "Budget contingency", "answer": "Add 15%"}
                ],
                "stance_now": "conditional",
                "concessions": ["Budget contingency"],
                "remaining_concerns": ["Timeline"],
                "escalation": False,
                "escalate_reason": "",
                "confidence": 0.5,
            },
            "board_vote": {
                "title": "Vote",
                "summary": "Approve with conditions.",
                "vote": "approve",
                "stance": "support",
                "reasoning": "The plan is deliverable.",
                "conditions": [],
                "confidence": 0.7,
            },
            "board_consensus": {
                "title": "Consensus",
                "decision": "The board approves.",
                "verdict": "approve",
                "mood": "consensus",
                "rationale": "Conditions are adopted.",
                "adopted_conditions": ["Budget contingency"],
                "action_items": ["Lock budget", "Publish checkpoint"],
                "minority_reports": [],
                "overall_confidence": 0.8,
                "confidence": 0.8,
            },
        }


@pytest.fixture
async def objective(session):
    repo = ObjectiveRepository(session)
    obj = Objective(raw_input="Launch a mobile ordering app in 6 months")
    created = await repo.create(obj)
    await session.commit()
    return created


@pytest.fixture
def fake_kernel() -> FakeKernel:
    return FakeKernel()


class TestRoster:
    def test_default_roster_has_ceo_and_seven_executives(self) -> None:
        assert DEFAULT_ROSTER[0] == "CEO"
        assert set(DEFAULT_ROSTER) == {
            "CEO",
            "Planner",
            "Engineering",
            "Finance",
            "Marketing",
            "Legal",
            "Risk",
            "Operations",
        }

    def test_every_roster_member_has_a_purpose(self) -> None:
        for role in DEFAULT_ROSTER:
            assert ROLE_PURPOSES[role]


class TestStartBoard:
    async def test_creates_running_session(
        self, session, fake_kernel, objective
    ) -> None:
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, title="Strategy call", launch=False
        )
        assert board.id is not None
        assert board.status == "running"
        assert board.objective_id == str(objective.id)
        assert board.title == "Strategy call"
        assert board.roster == DEFAULT_ROSTER
        assert "objective" in (board.brief or {})
        await session.refresh(board)

    async def test_system_message_persisted(
        self, session, fake_kernel, objective
    ) -> None:
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(objective.id, launch=False)
        messages = await service.list_messages(board.id)
        system = [m for m in messages if m.kind == KIND_SYSTEM]
        assert len(system) == 1
        assert system[0].sender == "system"

    async def test_start_board_launches_background_run(
        self, session, fake_kernel, objective
    ) -> None:
        import asyncio

        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(objective.id, roster=["CEO", "Finance"])
        for _ in range(50):
            await asyncio.sleep(0.05)
            await session.refresh(board)
            if board.status == "completed":
                break
        assert board.status == "completed"
        messages = await service.list_messages(board.id)
        assert len(messages) >= 2 + 2 + 1 + 2  # system+openings+delib+votes (no responses)

    async def test_custom_roster_used(self, session, fake_kernel, objective) -> None:
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, roster=["CEO", "Legal"], launch=False
        )
        assert board.roster == ["CEO", "Legal"]


class TestRunRounds:
    async def test_completes_with_full_transcript(
        self, session, fake_kernel, objective
    ) -> None:
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id,
            roster=["CEO", "Finance", "Engineering"],
            launch=False,
        )
        await service._run_rounds(board.id)

        await session.refresh(board)
        assert board.status == "completed"
        assert board.result is not None

        messages = await service.list_messages(board.id)
        kinds = {m.kind for m in messages}
        assert kinds == {
            KIND_SYSTEM,
            KIND_OPENING,
            KIND_DELIBERATION,
            KIND_RESPONSE,
            KIND_VOTE,
            KIND_CONSENSUS,
        }

        openings = [m for m in messages if m.kind == KIND_OPENING]
        deliberations = [m for m in messages if m.kind == KIND_DELIBERATION]
        votes = [m for m in messages if m.kind == KIND_VOTE]
        consensus = [m for m in messages if m.kind == KIND_CONSENSUS]

        assert len(openings) == 3
        assert len(deliberations) == 3
        assert len(votes) == 3
        assert len(consensus) == 1
        # Finance was challenged/asked by every deliberation, so it must respond
        responses = [m for m in messages if m.kind == KIND_RESPONSE]
        assert {m.sender for m in responses} == {"Finance"}

        for m in openings:
            assert m.payload and m.payload["key_points"]

    async def test_votes_rollup_and_verdict(
        self, session, fake_kernel, objective
    ) -> None:
        def vote_for(ctx: dict[str, Any]) -> dict[str, Any]:
            role = ctx["context"]["role"]["title"]
            if role == "Finance":
                return {
                    "title": "Vote",
                    "summary": "Conditional.",
                    "vote": "conditional",
                    "stance": "conditional",
                    "reasoning": "Budget not fixed.",
                    "conditions": ["15% contingency"],
                    "confidence": 0.55,
                }
            return {
                "title": "Vote",
                "summary": "Approve.",
                "vote": "approve",
                "stance": "support",
                "reasoning": "Deliverable.",
                "conditions": [],
                "confidence": 0.8,
            }

        fake_kernel._overrides["board_vote"] = vote_for
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, roster=["CEO", "Finance"], launch=False
        )
        await service._run_rounds(board.id)

        await session.refresh(board)
        result = board.result or {}
        assert result["counts"] == {"approve": 1, "conditional": 1, "abstain": 0, "reject": 0}
        assert result["verdict"] == "approve"
        assert result["mood"] == "consensus"
        assert len(result["roll_call"]) == 2
        assert result["action_items"]
        assert result["overall_confidence"] == 0.8

    async def test_reject_vote_creates_conflict_and_divided_mood(
        self, session, fake_kernel, objective
    ) -> None:
        def vote_for(ctx: dict[str, Any]) -> dict[str, Any]:
            role = ctx["context"]["role"]["title"]
            if role == "Risk":
                return {
                    "title": "Reject",
                    "summary": "Cannot support.",
                    "vote": "reject",
                    "stance": "oppose",
                    "reasoning": "Compliance exposure unacceptable.",
                    "conditions": [],
                    "confidence": 0.9,
                }
            return {
                "title": "Approve",
                "summary": "Support.",
                "vote": "approve",
                "stance": "support",
                "reasoning": "Deliverable.",
                "conditions": [],
                "confidence": 0.8,
            }

        fake_kernel._overrides["board_vote"] = vote_for
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, roster=["CEO", "Risk"], launch=False
        )
        await service._run_rounds(board.id)

        await session.refresh(board)
        result = board.result or {}
        assert result["mood"] == "stalemate"
        conflicts = result["conflicts"]
        assert any(
            c["severity"] == "high" and c["parties"] == ["Risk"] for c in conflicts
        )

    async def test_conditional_vote_lists_medium_conflict(
        self, session, fake_kernel, objective
    ) -> None:
        fake_kernel._overrides["board_vote"] = {
            "title": "Conditional",
            "summary": "Conditional.",
            "vote": "conditional",
            "stance": "conditional",
            "reasoning": "Needs budget.",
            "conditions": ["10% contingency"],
            "confidence": 0.5,
        }
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, roster=["CEO", "Finance"], launch=False
        )
        await service._run_rounds(board.id)

        await session.refresh(board)
        conflicts = (board.result or {})["conflicts"]
        assert any(c["severity"] == "medium" for c in conflicts)
        assert any("10% contingency" in c["details"] for c in conflicts)

    async def test_consensus_stores_payload(
        self, session, fake_kernel, objective
    ) -> None:
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, roster=["CEO"], launch=False
        )
        await service._run_rounds(board.id)

        await session.refresh(board)
        result = board.result or {}
        assert result["verdict"] == "approve"
        assert result["decision"] == "The board approves."
        assert "Budget contingency" in result["adopted_conditions"]

    async def test_llm_failure_degrades_gracefully(
        self, session, objective
    ) -> None:
        class BrokenKernel:
            async def run(self, _task_type: str, **_kwargs: Any) -> dict[str, Any]:
                raise RuntimeError("provider down")

        service = BoardService(session, kernel=BrokenKernel())
        board = await service.start_board(
            objective.id, roster=["CEO", "Finance"], launch=False
        )
        await service._run_rounds(board.id)

        # The board must not die when an executive's model call fails; the
        # failing voice is recorded as unavailable and the session completes.
        await session.refresh(board)
        assert board.status == "completed"
        messages = await service.list_messages(board.id)
        missed = [m for m in messages if "could not respond" in (m.content or "")]
        assert len(missed) >= 2


class TestMessages:
    async def test_list_messages_ordering(
        self, session, fake_kernel, objective
    ) -> None:
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, roster=["CEO"], launch=False
        )
        await service._run_rounds(board.id)
        messages = await service.list_messages(board.id)
        kinds = [m.kind for m in messages]
        assert kinds[0] == KIND_SYSTEM
        assert KIND_OPENING in kinds
        assert kinds.index(KIND_OPENING) < kinds.index(KIND_DELIBERATION)
        assert kinds.index(KIND_DELIBERATION) < kinds.index(KIND_VOTE)
        assert kinds.index(KIND_VOTE) < kinds.index(KIND_CONSENSUS)

    async def test_get_message_count(self, session, fake_kernel, objective) -> None:
        service = BoardService(session, kernel=fake_kernel)
        board = await service.start_board(
            objective.id, roster=["CEO", "Finance"], launch=False
        )
        await service._run_rounds(board.id)
        assert await service.get_message_count(board.id) >= 1

    async def test_list_sessions_orders_newest_first(
        self, session, fake_kernel, objective
    ) -> None:
        service = BoardService(session, kernel=fake_kernel)
        await service.start_board(objective.id, title="First", launch=False)
        second = await service.start_board(objective.id, title="Second", launch=False)
        sessions = await service.list_sessions()
        assert sessions[0].id == str(second.id)


def test_board_service_exposes_kernel_interface() -> None:
    assert hasattr(AIKernel, "run")
