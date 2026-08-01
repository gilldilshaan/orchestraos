"""Diagnostic: trace every pipeline stage for compile + readiness.
Logs rendered prompt, raw AI response, parsed JSON, and validated output.

Run: python scripts/compile_readiness_diagnostic.py   (from repo root)
"""

from __future__ import annotations

import asyncio
import io
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from app.config import settings
from app.kernel.output_validator import OutputValidator
from app.kernel.prompt_manager import PromptManager
from app.llm.client import llm_client


def log(label: str, obj: object, max_len: int = 2000) -> None:
    line = "─" * 72
    print(f"\n{line}")
    print(f"  {label}")
    print(f"{line}")
    text = json.dumps(obj, indent=2) if not isinstance(obj, str) else obj
    if len(text) > max_len:
        print(text[:max_len] + f"\n  ... (truncated, {len(text)} total chars)")
    else:
        print(text)


async def diagnose() -> None:
    print("=" * 72)
    print("  DIAGNOSTIC: Compile + Readiness Pipeline Tracing")
    print("=" * 72)
    print(f"\n  Provider: {llm_client.provider_name}")
    print(f"  Model:    llama-3.3-70b-versatile via Groq")
    print(f"  Groq Key: {'set' if settings.groq_api_key else 'not set'}")

    raw_input = (
        "Open a specialty coffee shop in downtown Austin with a focus on "
        "pour-over coffee and locally sourced pastries. Target launch in "
        "4 months with a budget of $250,000."
    )

    objective_id = "019fa867-cd94-7154-834d-c81870728b4b"

    prompt_manager = PromptManager()
    validator = OutputValidator()

    # ── DIAGNOSE COMPILE ──────────────────────────────────────────────────
    print("\n\n")
    print("█" * 72)
    print("  PHASE 1: COMPILE")
    print("█" * 72)

    # 1a. Check template exists
    template_name = "compiler_v1.md"
    template = prompt_manager.load_template(template_name)
    log(f"1a. RAW TEMPLATE [{template_name}]", template, max_len=3000)

    # 1b. Render with the EXACT context passed by the pipeline
    context = {
        "objective_id": objective_id,
        "raw_input": raw_input,
    }
    rendered = prompt_manager.render(template_name, context)
    log("1b. RENDERED PROMPT (context: raw_input only)", rendered, max_len=3000)

    # 1c. What does {{ objective.raw }} resolve to?
    print("\n  RESOLVE TEST: {{ objective.raw }}")
    resolved = prompt_manager._resolve_path(context, "objective.raw")
    print(f"    → '{resolved}' (length={len(resolved)})")
    print(f"    → resolved is {'empty string' if resolved == '' else 'non-empty'}")

    # 1d. What WOULD {{ raw_input }} resolve to?
    print("\n  RESOLVE TEST: {{ raw_input }}")
    resolved2 = prompt_manager._resolve_path(context, "raw_input")
    print(f"    → '{resolved2[:80]}...' (length={len(resolved2)})")

    # 1e. Try correct context format
    print("\n  RESOLVE TEST: {{ objective.raw }} WITH correct context")
    correct_context = {
        "objective_id": objective_id,
        "objective": {"raw": raw_input},
    }
    resolved3 = prompt_manager._resolve_path(correct_context, "objective.raw")
    print(f"    → '{resolved3[:80]}...' (length={len(resolved3)})")

    # 1f. Full render with correct context
    rendered_correct = prompt_manager.render(template_name, correct_context)
    log("1f. RENDERED PROMPT (context: objective.raw)", rendered_correct, max_len=3000)

    # 1g. Send to Groq and capture response
    print("\n\n  1g. SENDING TO GROQ...")
    try:
        system_prompt = "You are a business compiler. Output only valid JSON."
        raw_response = await llm_client.generate(
            prompt=rendered_correct,
            system_prompt=system_prompt,
            temperature=0.3,
            task_type="compile",
        )
        log("1g. RAW GROQ RESPONSE", raw_response, max_len=3000)
    except Exception as e:
        print(f"\n  ERROR: {e}")
        raw_response = ""

    # 1h. Parse JSON (step by step)
    if raw_response:
        print("\n\n  1h. ANALYZING RESPONSE PIPELINE...")

        raw_stripped = raw_response.strip()
        log("1h.1 After strip()", raw_stripped, max_len=2000)

        repaired = validator.repair_json(raw_stripped)
        log("1h.2 After repair_json()", repaired, max_len=2000)

        try:
            parsed = json.loads(repaired)
            log("1h.3 After json.loads()", parsed, max_len=3000)
        except json.JSONDecodeError as e:
            print(f"\n  JSON PARSE FAILED: {e}")
            parsed = {}

        # Check if fields are present
        expected_compile_fields = [
            "mission", "vision", "business_type", "industry",
            "stakeholders", "constraints", "kpis", "timeline",
            "budget", "dependencies", "assumptions", "risks",
            "success_metrics", "recommendation", "reasoning",
            "evidence", "confidence", "risk_level",
        ]
        print("\n  FIELD ANALYSIS:")
        for field in expected_compile_fields:
            val = parsed.get(field)
            status = "✓" if val is not None and val != "" and val != [] and val != {} else "✗ NULL/EMPTY"
            print(f"    {status} {field}: {type(val).__name__} = {str(val)[:60] if val else 'None'}")

    # ── DIAGNOSE READINESS ───────────────────────────────────────────────
    print("\n\n")
    print("█" * 72)
    print("  PHASE 2: READINESS")
    print("█" * 72)

    template_name = "readiness_v1.md"
    template = prompt_manager.load_template(template_name)
    log(f"2a. RAW TEMPLATE [{template_name}]", template, max_len=3000)

    # 2b. Check context mismatch
    context2 = {
        "objective_id": objective_id,
        "raw_input": raw_input,
    }
    rendered2 = prompt_manager.render(template_name, context2)
    log("2b. RENDERED PROMPT (context: raw_input only)", rendered2, max_len=3000)

    print("\n  RESOLVE TEST: {{ objective.raw }}")
    resolved4 = prompt_manager._resolve_path(context2, "objective.raw")
    print(f"    → '{resolved4}' (length={len(resolved4)})")

    # 2c. Render correctly and send
    correct_context2 = {
        "objective_id": objective_id,
        "objective": {"raw": raw_input},
        "compilation": {
            "mission": "Open a specialty coffee shop",
            "vision": "Become Austin's top coffee destination",
            "industry": "Food & Beverage",
            "budget": {"total": 250000.0, "currency": "USD"},
        },
    }
    rendered_correct2 = prompt_manager.render(template_name, correct_context2)
    log("2c. RENDERED PROMPT (correct context)", rendered_correct2, max_len=3000)

    print("\n\n  2d. SENDING TO GROQ...")
    try:
        raw_response2 = await llm_client.generate(
            prompt=rendered_correct2,
            system_prompt=system_prompt,
            temperature=0.3,
            task_type="readiness",
        )
        log("2d. RAW GROQ RESPONSE", raw_response2, max_len=3000)
    except Exception as e:
        print(f"\n  ERROR: {e}")
        raw_response2 = ""

    # 2e. Parse and validate
    if raw_response2:
        print("\n\n  2e. ANALYZING RESPONSE PIPELINE...")

        repaired2 = validator.repair_json(raw_response2)
        log("2e.1 After repair_json()", repaired2, max_len=2000)

        try:
            parsed2 = json.loads(repaired2)
            log("2e.2 After json.loads()", parsed2, max_len=3000)
        except json.JSONDecodeError as e:
            print(f"\n  JSON PARSE FAILED: {e}")
            parsed2 = {}

        expected_readiness_fields = [
            "overall_score", "market_readiness", "technical_feasibility",
            "budget_readiness", "team_readiness", "timeline_feasibility",
            "strengths", "weaknesses", "recommendations",
            "category_scores", "recommendation", "reasoning",
            "evidence", "confidence", "risk_level",
        ]
        print("\n  FIELD ANALYSIS:")
        for field in expected_readiness_fields:
            val = parsed2.get(field)
            status = "✓" if val is not None and val != "" and val != [] and val != {} else "✗ NULL/EMPTY"
            print(f"    {status} {field}: {type(val).__name__} = {str(val)[:60] if val else 'None'}")

    print("\n\n" + "=" * 72)
    print("  DIAGNOSTIC COMPLETE")
    print("=" * 72)


if __name__ == "__main__":
    asyncio.run(diagnose())
