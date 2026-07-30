"""Clean up demo data in-place.

Strategy: update the raw_input of EXISTING completed objectives
to be clean, realistic text. Avoids needing LLM pipeline.

Run: cd backend && .venv\Scripts\python seed_demo_data.py
"""

from __future__ import annotations

import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger(__name__)

CLEAN_REPLACEMENTS = [
    (
        "automatiom", "AI automation",
    ),
    (
        "automaion", "AI automation",
    ),
    (
        "automatiosn", "AI automation",
    ),
]

CLEAN_OBJECTIVES = [
    {
        "old_substring": "Build a Saas Workflow",
        "new_raw": "Build a SaaS workflow automation platform that integrates AI-powered task management and real-time team collaboration. Budget: $10k. Timeline: 3 months. Target: small business teams.",
    },
    {
        "old_substring": "Build a as saas workflow",
        "new_raw": "Develop an AI-driven SaaS platform for workflow automation with intelligent task routing and analytics dashboards. Budget: $10k. Timeline: 3 months.",
    },
    {
        "old_substring": "AI SAAS WORFLOW",
        "new_raw": "Create an enterprise AI SaaS platform for intelligent workflow orchestration with automated compliance checks. Initial budget: $19k. Timeline: 3 months.",
    },
    {
        "old_substring": "AI SAAS",
        "new_raw": "Build an AI-powered SaaS platform offering automated website generation and intelligent product recommendation engines. Budget: $10k. Timeline: 2 months. Constraints: AI automation, AI website products.",
    },
    {
        "old_substring": "A B2B SAAS AGENCY",
        "new_raw": "Launch a B2B SaaS agency specializing in AI-powered business process automation for mid-market companies. Budget: $50k. Timeline: 6 months.",
    },
    {
        "old_substring": "Cafe in chandigarh near sec 21",
        "new_raw": "Open an aesthetic multi-branch caf\u00e9 in Chandigarh's Sector 21 area with specialty coffee, co-working space, and weekend events. Budget: 10 lakhs INR. Timeline: 1 year.",
    },
    {
        "old_substring": "cafe in chd",
        "new_raw": "Open a specialty caf\u00e9 in Chandigarh with artisanal coffee and a modern minimalist interior. Budget: 5 lakhs. Timeline: 6 months.",
    },
    {
        "old_substring": "cAFE IN LUDHIANA",
        "new_raw": "Launch a premium caf\u00e9 in Ludhiana offering gourmet coffee, workspace facilities, and live music events. Budget: 10 lakhs. Timeline: 6 months.",
    },
    {
        "old_substring": "new coffee cafe in ludhaian",
        "new_raw": "Open a modern coffee caf\u00e9 in Ludhiana with a focus on fresh brews, comfort food, and a community-friendly atmosphere. Budget: 10 lakhs. Timeline: 6 months.",
    },
    {
        "old_substring": "A saas ai automation compony",
        "new_raw": "Build an AI-powered SaaS automation platform for North American customers, focusing on CRM integration and automated lead nurturing. Budget: $5k. Timeline: 2 months.",
    },
]


async def clean() -> None:
    from app.database.session import async_session_factory
    from app.models.objective import Objective
    from app.repositories.objective_repository import ObjectiveRepository
    from sqlalchemy import select

    async with async_session_factory() as session:
        repo = ObjectiveRepository(session)
        result = await session.execute(
            select(Objective).where(Objective.deleted_at.is_(None))
        )
        all_obj = result.scalars().all()
        log.info(f"Total objectives: {len(all_obj)}")

        updated = 0
        # Clean specific objectives by raw_input pattern
        for obj in all_obj:
            raw = obj.raw_input or ""

            for entry in CLEAN_OBJECTIVES:
                if entry["old_substring"] in raw:
                    log.info(f"  UPDATE: {raw[:70]}")
                    log.info(f"       -> {entry['new_raw'][:70]}")
                    await repo.update(obj.id, {"raw_input": entry["new_raw"]})
                    updated += 1
                    break

        # Also clean individual typos in remaining objectives
        for obj in all_obj:
            raw = obj.raw_input or ""
            new_raw = raw
            for typo, fix in CLEAN_REPLACEMENTS:
                if typo in new_raw.lower():
                    new_raw = new_raw.replace(typo, fix)
                    break

            # Clean up common casing issues
            import re
            # Fix ALL CAPS mixed text
            if new_raw != raw:
                log.info(f"  FIX TYPO: {raw[:60]}")
                log.info(f"         -> {new_raw[:60]}")
                await repo.update(obj.id, {"raw_input": new_raw})
                updated += 1

        log.info(f"\nUpdated {updated} objectives")

        await session.commit()
        log.info("Committed successfully")


if __name__ == "__main__":
    asyncio.run(clean())
