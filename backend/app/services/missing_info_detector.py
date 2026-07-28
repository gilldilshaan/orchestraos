from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.features import MissingInfoCheck
from app.repositories.features_repository import MissingInfoCheckRepository
from app.repositories.objective_repository import ObjectiveRepository


class MissingInfoDetectorService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = MissingInfoCheckRepository(session)
        self._obj_repo = ObjectiveRepository(session)

    async def check(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await ai_kernel.run(
            task_type="missing_info",
            prompt_template="missing_info_v1.md",
            context=context,
        )

        missing_fields = result.get("missing_fields", [])
        critical_missing = result.get("critical_missing", [])
        clarification_questions = result.get("clarification_questions", [])
        is_complete = result.get("is_complete", len(missing_fields) == 0)

        existing = await self._repo.get_by_objective(objective_id)
        if existing:
            check = existing
            update_data = {
                "missing_fields": missing_fields,
                "critical_missing": critical_missing,
                "clarification_questions": clarification_questions,
                "is_complete": is_complete,
                "refinement_round": existing.refinement_round + 1,
            }
            prev = existing.previous_responses or {}
            if existing.clarification_questions:
                prev[f"round_{existing.refinement_round}"] = {
                    "questions": existing.clarification_questions,
                    "answers": {},
                }
            update_data["previous_responses"] = prev
            await self._repo.update(existing.id, update_data)
        else:
            check = MissingInfoCheck(
                objective_id=objective_id,
                missing_fields=missing_fields,
                critical_missing=critical_missing,
                clarification_questions=clarification_questions,
                is_complete=is_complete,
                refinement_round=1,
                previous_responses={},
            )
            check = await self._repo.create(check)

        return {
            "id": check.id,
            "objective_id": check.objective_id,
            "missing_fields": check.missing_fields,
            "critical_missing": check.critical_missing,
            "clarification_questions": check.clarification_questions,
            "is_complete": check.is_complete,
            "refinement_round": check.refinement_round,
        }

    async def refine(self, objective_id: str, answers: dict[str, Any]) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        existing = await self._repo.get_by_objective(objective_id)
        if not existing:
            return await self.check(objective_id)

        prev_responses = existing.previous_responses or {}
        prev_responses[f"round_{existing.refinement_round}"] = {
            "questions": existing.clarification_questions,
            "answers": answers,
        }

        enriched_input = objective.raw_input + "\n\nAdditional context:\n"
        for key, value in answers.items():
            enriched_input += f"- {key}: {value}\n"

        context = {"objective": {"raw": enriched_input}}

        result = await ai_kernel.run(
            task_type="missing_info",
            prompt_template="missing_info_v1.md",
            context=context,
        )

        missing_fields = result.get("missing_fields", [])
        critical_missing = result.get("critical_missing", [])
        clarification_questions = result.get("clarification_questions", [])
        is_complete = result.get("is_complete", len(missing_fields) == 0)

        await self._repo.update(existing.id, {
            "missing_fields": missing_fields,
            "critical_missing": critical_missing,
            "clarification_questions": clarification_questions,
            "is_complete": is_complete,
            "refinement_round": existing.refinement_round + 1,
            "previous_responses": prev_responses,
        })

        return {
            "id": existing.id,
            "objective_id": existing.objective_id,
            "missing_fields": missing_fields,
            "critical_missing": critical_missing,
            "clarification_questions": clarification_questions,
            "is_complete": is_complete,
            "refinement_round": existing.refinement_round + 1,
        }

    async def get_check(self, objective_id: str) -> dict[str, Any] | None:
        check = await self._repo.get_by_objective(objective_id)
        if not check:
            return None
        return {
            "id": check.id,
            "objective_id": check.objective_id,
            "missing_fields": check.missing_fields,
            "critical_missing": check.critical_missing,
            "clarification_questions": check.clarification_questions,
            "is_complete": check.is_complete,
            "refinement_round": check.refinement_round,
            "previous_responses": check.previous_responses,
        }
