from __future__ import annotations

from app.agents.base import BaseAgent
from app.schemas.dynamic_org import (
    DynamicOrganizationStructure,
    ExecutiveRole,
    OrganizationIntelligence,
    SpecialistRole,
)


class OrganizationGenerator(BaseAgent):
    async def generate(
        self,
        objective_id: str,
        intelligence: OrganizationIntelligence,
    ) -> DynamicOrganizationStructure:
        from app.repositories.objective_repository import ObjectiveRepository

        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        if not objective:
            return DynamicOrganizationStructure(
                company_name="Unknown", industry="general", executives=[]
            )

        context = {
            "objective": {"raw": objective.raw_input},
            "intelligence": intelligence.model_dump(),
        }

        result = await self._llm.run(
            task_type="organization_generator",
            prompt_template="organization_generator_v1.md",
            context=context,
            temperature=0.6,
        )

        executives_data = result.get("executives", [])
        executives = []
        for ex in executives_data:
            specialists_data = ex.get("required_specialists", [])
            specialists = [
                SpecialistRole(title=s, purpose="", responsibilities=[])
                for s in specialists_data
            ] if ex.get("requires_specialists", False) else []

            exec_role = ExecutiveRole(
                title=ex.get("title", "Executive"),
                purpose=ex.get("purpose", ""),
                responsibilities=ex.get("responsibilities", []),
                requires_specialists=ex.get("requires_specialists", False),
                required_specialists=ex.get("required_specialists", []),
                children=specialists,
            )
            executives.append(exec_role)

        org = DynamicOrganizationStructure(
            company_name=result.get("company_name", "Organization"),
            industry=result.get("industry", "general"),
            executives=executives,
        )

        await self._save_explanation(
            entity_type="DynamicOrganization",
            entity_id=objective_id,
            recommendation=f"Created {org.company_name} with {len(executives)} executives",
            reasoning=f"Organization designed for {org.industry} industry "
                       f"with {len(executives)} executive roles",
            evidence=[
                f"Company: {org.company_name}",
                f"Industry: {org.industry}",
                f"Executives: {[e.title for e in executives]}",
            ],
            confidence=0.85,
            risk_level="low",
        )

        return org
