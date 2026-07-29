from __future__ import annotations

import json

from app.llm import fallback


class TestIndustryClassification:
    def test_food_objective_gets_food_profile(self):
        profile = fallback._profile_for(
            {
                "objective_text": "Launch a new farm-to-table restaurant in Austin",
                "industry": "",
                "business_type": "",
            }
        )
        assert profile["label"] == "Food & Beverage"

    def test_healthcare_objective_gets_healthcare_profile(self):
        profile = fallback._profile_for(
            {
                "objective_text": "Open a telehealth clinic for rural patients",
                "industry": "",
                "business_type": "",
            }
        )
        assert profile["label"] == "Healthcare"

    def test_generic_objective_defaults_to_technology(self):
        profile = fallback._profile_for(
            {
                "objective_text": "Build a B2B SaaS platform for logistics companies",
                "industry": "",
                "business_type": "",
            }
        )
        assert profile["label"] == "Technology & Software"


class TestFactExtraction:
    def test_extracts_explicit_budget(self):
        prompt = 'Compilation: {"budget": {"total": 250000.0, "currency": "USD"}}'
        facts = fallback._extract_facts(prompt)
        assert facts["budget"] == 250000.0
        assert facts["budget_explicit"] is True

    def test_defaults_budget_when_absent(self):
        facts = fallback._extract_facts("Objective: Do a thing\nConstraints: {}")
        assert facts["budget_explicit"] is False
        assert facts["budget"] > 0


class TestContextAwareOutputVaries:
    def test_organization_departments_differ_by_industry(self):
        restaurant_prompt = (
            "Generate an organizational structure for this objective:\n\n"
            "Business Type: null\nIndustry: null\n"
            'Compilation: {"industry": "Food & Beverage"}\n'
            "Plan: null\n"
            "Objective: Open a new restaurant downtown"
        )
        saas_prompt = (
            "Generate an organizational structure for this objective:\n\n"
            "Business Type: null\nIndustry: null\n"
            "Plan: null\n"
            "Objective: Build a SaaS analytics platform for retailers"
        )
        restaurant_out = json.loads(fallback.generate(restaurant_prompt, task_type="organization"))
        saas_out = json.loads(fallback.generate(saas_prompt, task_type="organization"))

        restaurant_names = {d["name"] for d in restaurant_out["departments"]}
        saas_names = {d["name"] for d in saas_out["departments"]}
        assert restaurant_names != saas_names
        assert "Culinary Operations" in restaurant_names
        assert "Engineering" in saas_names

    def test_plan_reflects_budget_scale(self):
        prompt = (
            'Compilation: {"budget": {"total": 1000000.0}}\nObjective: Build a fintech lending app'
        )
        out = json.loads(fallback.generate(prompt, task_type="plan"))
        assert out["total_cost"] == 900000.0


class TestTaskTypeRoutingFixesAmbiguity:
    """Regression test: devils_advocate_v1.md and dependency_graph_v1.md both
    render 'Plan:' and 'Milestones:' sections, which previously caused
    keyword-sniffing routing to misfire into the plan/roadmap fallback.
    Routing via explicit task_type must always select the correct builder.
    """

    def _devils_advocate_prompt(self) -> str:
        return (
            "You are an AI Devil's Advocate. Rigorously challenge the proposed strategy.\n\n"
            "Objective: Launch a new product\n"
            "Constraints: {}\n"
            'Plan: {"roadmap": {}, "timeline": {}}\n'
            "Milestones: []\n"
            "Risks: []\n"
            "Departments: []\n"
        )

    def test_devils_advocate_routes_correctly_via_task_type(self):
        out = json.loads(
            fallback.generate(self._devils_advocate_prompt(), task_type="devils_advocate")
        )
        assert "critique_score" in out
        assert "counter_arguments" in out

    def test_devils_advocate_routes_correctly_via_keyword_fallback(self):
        out = json.loads(fallback.generate(self._devils_advocate_prompt(), task_type=None))
        assert "critique_score" in out

    def test_dependency_graph_routes_correctly_via_task_type(self):
        prompt = (
            "Analyze dependencies and build a dependency graph for this objective:\n\n"
            "Objective: Launch a new product\n"
            'Plan: {"roadmap": {}}\n'
            "Milestones: []\n"
            "Departments: []\n"
            "Risks: []\n"
        )
        out = json.loads(fallback.generate(prompt, task_type="dependency_graph"))
        assert "nodes" in out
        assert "critical_path" in out
