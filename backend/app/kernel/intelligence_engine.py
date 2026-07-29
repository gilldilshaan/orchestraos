from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.kernel.ai_kernel import AIKernel
from app.repositories.objective_repository import ObjectiveRepository
from app.schemas.dynamic_org import (
    Capability,
    OrganizationIntelligence,
)


class IntelligenceEngine:
    """Analyzes an objective and determines what organization is needed.

    This is a kernel service — NOT an agent. It does not persist explanations
    or create entities. It returns pure analysis that downstream components
    (CEO, OrganizationGenerator) consume.
    """

    def __init__(
        self,
        session: AsyncSession,
        kernel: AIKernel | None = None,
    ) -> None:
        self._session = session
        self._kernel = kernel or ai_kernel

    async def analyze(self, objective_id: str) -> OrganizationIntelligence:
        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        if not objective:
            return OrganizationIntelligence(
                domain="unknown",
                complexity="medium",
                reasoning="Objective not found",
            )

        context = {"objective": {"raw": objective.raw_input}}

        result = await self._kernel.run(
            task_type="intelligence",
            prompt_template="intelligence_v1.md",
            context=context,
            temperature=0.4,
        )

        caps_data = result.get("required_capabilities", [])
        capabilities = [
            Capability(
                name=c.get("name", ""),
                description=c.get("description", ""),
                proficiency=c.get("proficiency", "intermediate"),
            )
            for c in caps_data
        ]

        return OrganizationIntelligence(
            domain=result.get("domain", "general"),
            complexity=result.get("complexity", "medium"),
            required_capabilities=capabilities,
            estimated_team_size=result.get("estimated_team_size", 3),
            reasoning=result.get("reasoning", ""),
        )
