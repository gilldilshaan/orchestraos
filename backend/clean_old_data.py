"""Soft-delete old test/duplicate objectives and their related data.

Keeps only:
- The 5 newly seeded clean objectives
- Objectives with unique, non-typo content that looks real

Run: cd backend && .venv\Scripts\python clean_old_data.py
"""

from __future__ import annotations

import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger(__name__)

# Patterns that identify junk/test data (UPPERCASE, typos, duplicates)
JUNK_PATTERNS = [
    "automatiom", "automaion", "automatiosn",  # typos
    "SOON", "SLON", "SOON",                     # placeholder text
    "10LAKHS", "10LAKH",                         # test budgets
    "CAFE IN LUDHIA", "CAFE IN CHANDI",         # duplicate entries
    "cAFE IN LUDHIA", "cAFE IN CHANDI",
    "cafe in chd", "cafe in ludhian",
    "new coffee cafe",
    "A B2B SAAS AGENCY",                         # random caps
    "A saas ai automation",
    "AI SAAS WORF", "AI SAAS" "AI SAAS",
    "Test pipeline fix",                         # test entries
]

# Objectives to KEEP (clean, unique, demo-quality)
KEEP_SUBSTRINGS = [
    "Launch a healthcare diagnostics",
    "Open a specialty coffee shop in downtown Austin",
    "Build a B2B SaaS workflow automation",
    "Develop a mobile-first micro-investing",
    "Transform a regional healthcare network",
    "Cloud-native monitoring platform",
    "Launch a coffee shop in Ludhiana",
    "AI-powered medical imaging",
    "specialty coffee shop",
    "B2B SaaS invoicing platform",
    "healthcare AI platform for diagnostics",
    "micro-investing app",
    "healthcare network digital infrastructure",
]


async def clean() -> None:
    from app.database.session import async_session_factory
    from app.models.objective import Objective
    from sqlalchemy import select, delete, and_, or_

    async with async_session_factory() as session:
        result = await session.execute(
            select(Objective).where(Objective.deleted_at.is_(None))
        )
        all_obj = result.scalars().all()
        log.info(f"Total non-deleted objectives: {len(all_obj)}")

        kept = 0
        deleted = 0

        for obj in all_obj:
            raw = (obj.raw_input or "").strip()

            # Check if it matches a keep pattern
            should_keep = any(k in raw for k in KEEP_SUBSTRINGS)

            # Check if it matches junk
            is_junk = any(p.lower() in raw.lower() for p in JUNK_PATTERNS)

            if should_keep:
                kept += 1
                log.info(f"  KEEP: {raw[:70]}")
            elif is_junk or len(raw) < 15:
                log.info(f"  DELETE: {raw[:70]}")
                obj.deleted_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
                deleted += 1
            else:
                kept += 1
                log.info(f"  KEEP (unique): {raw[:70]}")

        await session.flush()
        log.info(f"\nKept: {kept}, Deleted: {deleted}")


if __name__ == "__main__":
    asyncio.run(clean())
