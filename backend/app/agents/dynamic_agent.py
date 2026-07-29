from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.kernel.ai_kernel import AIKernel


class DynamicAgent(BaseAgent):
    """A generic agent that can play any role in a dynamic organization.

    Backward-compatible: the original constructor and run() still work.
    New code should prefer the static execute_prompt() method which
    performs pure LLM execution without holding role state.
    """

    def __init__(
        self,
        session: Any,
        title: str,
        purpose: str,
        responsibilities: list[str],
        company_name: str,
        industry: str,
        parent_title: str | None = None,
        executive_context: str | None = None,
        kernel: Any | None = None,
        context: Any | None = None,
    ) -> None:
        super().__init__(session, kernel=kernel, context=context)
        self._role_title = title
        self._purpose = purpose
        self._responsibilities = responsibilities
        self._company_name = company_name
        self._industry = industry
        self._parent_title = parent_title
        self._executive_context = executive_context

    async def run(self, objective_id: str) -> dict[str, Any]:
        from app.repositories.objective_repository import ObjectiveRepository

        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        is_executive = self._parent_title is None
        template = "executive_v1.md" if is_executive else "specialist_v1.md"
        task_type = "executive" if is_executive else "specialist"

        context: dict[str, Any] = {
            "title": self._role_title,
            "purpose": self._purpose,
            "responsibilities": self._responsibilities,
            "company_name": self._company_name,
            "industry": self._industry,
            "objective": {"raw": objective.raw_input},
        }

        if not is_executive:
            context["parent_title"] = self._parent_title
            context["executive_context"] = self._executive_context or ""

        result = await self._llm.run(
            task_type=task_type,
            prompt_template=template,
            context=context,
            temperature=0.4 if is_executive else 0.3,
        )

        await self._save_explanation(
            entity_type="DynamicRole",
            entity_id=f"{objective_id}:{self._role_title}",
            recommendation=result.get("summary", "")[:200],
            reasoning=f"{self._role_title} analysis for {self._company_name}",
            evidence=[str(result)],
            confidence=result.get("confidence", 0.7),
            risk_level="medium",
        )

        return dict(result)

    @staticmethod
    async def execute_prompt(
        task_type: str,
        prompt_template: str,
        context: dict[str, Any],
        temperature: float = 0.3,
        kernel: AIKernel | None = None,
    ) -> dict[str, Any]:
        """Pure LLM execution without role state.

        This is the execution engine used by RuntimeExecutive and other
        runtime components. It performs the LLM call directly without
        requiring a full agent instance.

        Unlike run(), this does NOT persist explanations — that is the
        responsibility of the caller (RuntimeExecutive, OrganizationExecutor).
        """
        from app.kernel import ai_kernel as default_kernel

        actual_kernel = kernel or default_kernel
        return await actual_kernel.run(
            task_type=task_type,
            prompt_template=prompt_template,
            context=context,
            temperature=temperature,
        )
