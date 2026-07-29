"""End-to-end pipeline test: plan for opening a coffee shop.
Shows every step with real Groq-powered AI output."""

from __future__ import annotations

import asyncio
import io
import json
import sys
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import logging
logging.basicConfig(level=logging.INFO, format="%(message)s")

from sqlalchemy import text

from app.config import settings
from app.database.session import async_session_factory
from app.kernel.ai_kernel import AIKernel
from app.llm.client import llm_client
from app.models.objective import Objective
from app.repositories.objective_repository import ObjectiveRepository


def banner(title: str) -> None:
    line = "=" * 72
    print(f"\n{line}")
    print(f"  {title}")
    print(f"{line}\n")





async def run_pipeline() -> None:
    banner("ORCHESTRAOS — COFFEE SHOP PIPELINE DEMO")
    print(f"Provider: {llm_client.provider_name} (available={llm_client.available})")
    print(f"Model:    llama-3.3-70b-versatile via Groq")
    print(f"Groq Key: {'set' if settings.groq_api_key else 'not set'}")
    print(f"DB URL:   {settings.database_url}")

    kernel = AIKernel()

    async with async_session_factory() as session:
        objective_repo = ObjectiveRepository(session)
        raw_input = "Open a specialty coffee shop in downtown Austin with a focus on pour-over coffee and locally sourced pastries. Target launch in 4 months with a budget of $250,000."

        banner("STEP 0: CREATE OBJECTIVE")
        obj = Objective(raw_input=raw_input)
        created = await objective_repo.create(obj)
        oid = created.id
        print(f"Objective ID: {oid}")
        print(f"Raw Input: {raw_input}")

        # ── Step 1: Compile ──────────────────────────────────────────────
        banner("STEP 1: COMPILE OBJECTIVE")
        start = time.monotonic()
        compiled = await kernel.run(
            task_type="compile",
            prompt_template="compiler_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(compiled, indent=2))

        # ── Step 2: Business Readiness ───────────────────────────────────
        banner("STEP 2: BUSINESS READINESS ASSESSMENT")
        start = time.monotonic()
        readiness = await kernel.run(
            task_type="readiness",
            prompt_template="readiness_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(readiness, indent=2))

        # ── Step 3: Plan ─────────────────────────────────────────────────
        banner("STEP 3: PLAN (ROADMAP + MILESTONES)")
        start = time.monotonic()
        plan = await kernel.run(
            task_type="plan",
            prompt_template="planner_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "readiness": readiness,
            },
            temperature=0.4,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(plan, indent=2))

        # ── Step 4: Organization ─────────────────────────────────────────
        banner("STEP 4: ORGANIZATION STRUCTURE")
        start = time.monotonic()
        org = await kernel.run(
            task_type="organization",
            prompt_template="organization_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
            },
            temperature=0.4,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(org, indent=2))

        # ── Step 5: Risk Assessment ──────────────────────────────────────
        banner("STEP 5: RISK ASSESSMENT")
        start = time.monotonic()
        risks = await kernel.run(
            task_type="risk",
            prompt_template="risk_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "organization": org,
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(risks, indent=2))

        # ── Step 6: Decision ─────────────────────────────────────────────
        banner("STEP 6: STRATEGIC DECISION")
        start = time.monotonic()
        decision = await kernel.run(
            task_type="decision",
            prompt_template="decision_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "organization": org,
                "risks": risks,
            },
            temperature=0.4,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(decision, indent=2))

        # ── Step 7: Devil's Advocate ─────────────────────────────────────
        banner("STEP 7: DEVIL'S ADVOCATE CRITIQUE")
        start = time.monotonic()
        critique = await kernel.run(
            task_type="devils_advocate",
            prompt_template="devils_advocate_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "organization": org,
                "risks": risks,
                "decision": decision,
            },
            temperature=0.7,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(critique, indent=2))

        # ── Step 8: Success Probability ──────────────────────────────────
        banner("STEP 8: SUCCESS PROBABILITY")
        start = time.monotonic()
        prob = await kernel.run(
            task_type="success_probability",
            prompt_template="success_probability_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "risks": risks,
                "decision": decision,
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(prob, indent=2))

        # ── Step 9: Resource Gap ─────────────────────────────────────────
        banner("STEP 9: RESOURCE GAP ANALYSIS")
        start = time.monotonic()
        gaps = await kernel.run(
            task_type="resource_gap",
            prompt_template="resource_gap_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "organization": org,
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(gaps, indent=2))

        # ── Step 10: Dependency Graph ────────────────────────────────────
        banner("STEP 10: DEPENDENCY GRAPH")
        start = time.monotonic()
        deps = await kernel.run(
            task_type="dependency_graph",
            prompt_template="dependency_graph_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "risks": risks,
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(deps, indent=2))

        # ── Step 11: Bottleneck Detection ────────────────────────────────
        banner("STEP 11: BOTTLENECK DETECTION")
        start = time.monotonic()
        bottlenecks = await kernel.run(
            task_type="bottleneck",
            prompt_template="bottleneck_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "organization": org,
                "risks": risks,
                "dependencies": deps,
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(bottlenecks, indent=2))

        # ── Step 12: Dashboard ───────────────────────────────────────────
        banner("STEP 12: EXECUTIVE DASHBOARD")
        start = time.monotonic()
        dashboard = await kernel.run(
            task_type="dashboard",
            prompt_template="dashboard_v1.md",
            context={
                "objective_id": oid,
                "objective": {"raw": raw_input},
                "compilation": compiled,
                "plan": plan,
                "organization": org,
                "risks": risks,
                "decision": decision,
                "critique": critique,
                "success_probability": prob,
                "resource_gaps": gaps,
                "dependencies": deps,
                "bottlenecks": bottlenecks,
            },
            temperature=0.3,
        )
        elapsed = (time.monotonic() - start) * 1000
        print(f"[{elapsed:.0f}ms]\n")
        print(json.dumps(dashboard, indent=2))

        # ── Summary ──────────────────────────────────────────────────────
        banner("PIPELINE COMPLETE — EXECUTION SUMMARY")
        kernel.print_summary()

        # Cleanup: soft-delete the test objective
        await objective_repo.update(oid, {"status": "draft"})
        await objective_repo.soft_delete(oid)
        print(f"\nCleaned up objective {oid}")

    print("\n✅ Coffee shop pipeline completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_pipeline())
