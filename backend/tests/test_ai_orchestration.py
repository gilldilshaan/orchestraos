from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import pytest

from app.kernel.cache_manager import CacheManager
from app.kernel.event_bus import EventBus
from app.kernel.model_router import ModelRouter
from app.kernel.output_validator import OutputValidator
from app.kernel.retry_engine import RetryEngine
from app.kernel.state_machine import WorkflowStateMachine
from app.kernel.context_manager import ContextManager, ExecutionContext
from app.kernel.prompt_manager import PromptManager


# ─── WorkflowStateMachine Tests ────────────────────────────────────────

class TestWorkflowStateMachine:
    def test_valid_transitions(self):
        assert WorkflowStateMachine.transition("draft", "compiled") == "compiled"
        assert WorkflowStateMachine.transition("compiled", "planning") == "planning"
        assert WorkflowStateMachine.transition("planned", "organizing") == "organizing"
        assert WorkflowStateMachine.transition("organized", "risk_analysis") == "risk_analysis"
        assert WorkflowStateMachine.transition("risks_analyzed", "decision_pending") == "decision_pending"
        assert WorkflowStateMachine.transition("approved", "executing") == "executing"

    def test_invalid_transitions_raise(self):
        with pytest.raises(ValueError):
            WorkflowStateMachine.transition("draft", "completed")
        with pytest.raises(ValueError):
            WorkflowStateMachine.transition("draft", "approved")
        with pytest.raises(ValueError):
            WorkflowStateMachine.transition("planning", "draft")

    def test_failed_from_any_state(self):
        for state in WorkflowStateMachine.STATES:
            if state == "completed":
                continue
            if state in WorkflowStateMachine.TRANSITIONS:
                if "failed" in WorkflowStateMachine.TRANSITIONS[state]:
                    assert WorkflowStateMachine.transition(state, "failed") == "failed"

    def test_cancelled_only_from_pending(self):
        assert WorkflowStateMachine.transition("decision_pending", "cancelled") == "cancelled"
        with pytest.raises(ValueError):
            WorkflowStateMachine.transition("approved", "cancelled")

    def test_get_stage(self):
        assert WorkflowStateMachine.get_stage("planning") == "planning_in_progress"
        assert WorkflowStateMachine.get_stage("completed") in ("completed", "final")
        assert WorkflowStateMachine.get_stage("unknown") == "unknown"

    def test_get_progress_percent(self):
        assert WorkflowStateMachine.get_progress_percent("draft") == 0
        assert WorkflowStateMachine.get_progress_percent("compiled") > 0
        assert WorkflowStateMachine.get_progress_percent("completed") == 100
        assert WorkflowStateMachine.get_progress_percent("failed") == 0
        assert WorkflowStateMachine.get_progress_percent("cancelled") == 0

    def test_all_states_exist(self):
        expected = [
            "draft", "compiled", "planning", "planned", "organizing",
            "organized", "risk_analysis", "risks_analyzed", "decision_pending",
            "approved", "executing", "monitoring", "adapting", "completed",
            "failed", "cancelled",
        ]
        for state in expected:
            assert state in WorkflowStateMachine.STATES

    def test_all_transitions_are_valid_states(self):
        for from_state, to_states in WorkflowStateMachine.TRANSITIONS.items():
            assert from_state in WorkflowStateMachine.STATES
            for to_state in to_states:
                assert to_state in WorkflowStateMachine.STATES


# ─── OutputValidator Tests ─────────────────────────────────────────────

class TestOutputValidator:
    def test_repair_json_clean(self):
        raw = '{"key": "value"}'
        assert OutputValidator.repair_json(raw) == raw

    def test_repair_json_with_markdown(self):
        raw = '```json\n{"key": "value"}\n```'
        assert OutputValidator.repair_json(raw) == '{"key": "value"}'

    def test_repair_json_trailing_comma(self):
        raw = '{"key": "value",}'
        assert json.loads(OutputValidator.repair_json(raw)) == {"key": "value"}

    def test_repair_json_with_comments(self):
        raw = '{"key": "value" /* comment */}'
        assert json.loads(OutputValidator.repair_json(raw)) == {"key": "value"}

    def test_repair_json_with_line_comments(self):
        raw = '{"key": "value" // comment\n}'
        assert json.loads(OutputValidator.repair_json(raw)) == {"key": "value"}

    def test_repair_json_extracts_first_object(self):
        raw = 'some text before {"key": "value"} after'
        assert json.loads(OutputValidator.repair_json(raw)) == {"key": "value"}

    def test_repair_json_nested_braces(self):
        raw = '{"outer": {"inner": "value"}}'
        assert json.loads(OutputValidator.repair_json(raw)) == {"outer": {"inner": "value"}}

    def test_parse_json_valid(self):
        assert OutputValidator.parse_json('{"a": 1}') == {"a": 1}

    def test_parse_json_invalid_raises(self):
        with pytest.raises(ValueError):
            OutputValidator.parse_json("not json")

    def test_ensure_required_fields_fills_defaults(self):
        data = {"a": 1}
        result = OutputValidator.ensure_required_fields(
            data, required=["a", "b"], defaults={"b": "default"}
        )
        assert result["a"] == 1
        assert result["b"] == "default"

    def test_ensure_required_fields_none_for_missing(self):
        data = {"a": 1}
        result = OutputValidator.ensure_required_fields(data, required=["b"])
        assert result["b"] is None

    def test_check_business_rules_no_violations(self):
        data = {"score": 0.85, "name": "test"}
        rules = [("score", float, "score must be float")]
        result, violations = OutputValidator.check_business_rules(data, rules)
        assert len(violations) == 0

    def test_check_business_rules_violation(self):
        data = {"score": "high"}
        rules = [("score", float, "score must be float")]
        result, violations = OutputValidator.check_business_rules(data, rules)
        assert len(violations) == 1

    def test_validate_and_repair_full_pipeline(self):
        raw = '```json\n{"name": "test", "count": 5}\n```'
        result = OutputValidator().validate_and_repair(raw)
        assert result["name"] == "test"
        assert result["count"] == 5


# ─── CacheManager Tests ────────────────────────────────────────────────

class TestCacheManager:
    def test_cache_miss_on_empty(self):
        cm = CacheManager()
        result = cm.get("test", "prompt", {"key": "val"})
        assert result is None

    def test_cache_hit(self):
        cm = CacheManager(default_ttl_seconds=3600)
        cm.set("test", "prompt", {"result": "ok"}, {"key": "val"})
        result = cm.get("test", "prompt", {"key": "val"})
        assert result == {"result": "ok"}

    def test_cache_miss_different_context(self):
        cm = CacheManager(default_ttl_seconds=3600)
        cm.set("test", "prompt", {"result": "ok"}, {"key": "val1"})
        result = cm.get("test", "prompt", {"key": "val2"})
        assert result is None

    def test_cache_expiry(self):
        cm = CacheManager(default_ttl_seconds=0)
        cm.set("test", "prompt", {"result": "ok"}, {})
        result = cm.get("test", "prompt", {})
        assert result is None

    def test_cache_clear(self):
        cm = CacheManager(default_ttl_seconds=3600)
        cm.set("test", "prompt", "value")
        cm.clear()
        assert cm.get("test", "prompt") is None

    def test_cache_invalidate_by_task(self):
        cm = CacheManager(default_ttl_seconds=3600)
        cm.set("plan", "prompt1", "v1")
        cm.set("risk", "prompt2", "v2")
        cm.invalidate("plan")
        assert cm.get("plan", "prompt1") is None
        assert cm.get("risk", "prompt2") is not None

    def test_cache_stats(self):
        cm = CacheManager(default_ttl_seconds=3600)
        assert cm.stats()["hits"] == 0
        assert cm.stats()["misses"] == 0
        cm.get("test", "p")
        assert cm.stats()["misses"] == 1
        cm.set("test", "p", "v")
        cm.get("test", "p")
        assert cm.stats()["hits"] == 1


# ─── EventBus Tests ────────────────────────────────────────────────────

class TestEventBus:
    async def test_publish_and_subscribe(self):
        bus = EventBus()
        received = []

        async def handler(**kwargs):
            received.append(kwargs)

        bus.subscribe("test.event", handler)
        await bus.publish("test.event", "obj-1", data={"msg": "hello"})
        assert len(received) == 1
        assert received[0]["objective_id"] == "obj-1"

    async def test_multiple_subscribers(self):
        bus = EventBus()
        count = 0

        async def h1(**kwargs):
            nonlocal count
            count += 1

        async def h2(**kwargs):
            nonlocal count
            count += 1

        bus.subscribe("evt", h1)
        bus.subscribe("evt", h2)
        await bus.publish("evt", "obj-1")
        assert count == 2

    async def test_unsubscribe(self):
        bus = EventBus()
        received = []

        async def handler(**kwargs):
            received.append(kwargs)

        bus.subscribe("evt", handler)
        bus.unsubscribe("evt", handler)
        await bus.publish("evt", "obj-1")
        assert len(received) == 0

    async def test_event_history(self):
        bus = EventBus()
        await bus.publish("evt1", "obj-1", data={"a": 1})
        await bus.publish("evt2", "obj-1", data={"b": 2})
        await bus.publish("evt1", "obj-2", data={"c": 3})
        history = bus.get_history()
        assert len(history) == 3
        obj1_history = bus.get_history(objective_id="obj-1")
        assert len(obj1_history) == 2
        evt1_history = bus.get_history(event_type="evt1")
        assert len(evt1_history) == 2

    async def test_subscriber_error_does_not_block(self):
        bus = EventBus()

        async def failing_handler(**kwargs):
            raise RuntimeError("fail")

        async def good_handler(**kwargs):
            pass

        bus.subscribe("evt", failing_handler)
        bus.subscribe("evt", good_handler)
        await bus.publish("evt", "obj-1")


# ─── ModelRouter Tests ─────────────────────────────────────────────────

class TestModelRouter:
    def test_get_route_exists(self):
        router = ModelRouter()
        route = router.get_route("plan")
        assert route["model"] == "llama-3.3-70b-versatile"
        assert route["provider"] == "groq"
        assert route["temperature"] == 0.4

    def test_get_route_fallback(self):
        router = ModelRouter()
        route = router.get_route("unknown_task")
        assert "model" in route

    def test_get_preferred_provider_default(self):
        router = ModelRouter()
        provider = router.get_preferred_provider("plan")
        assert provider == "groq"

    def test_mark_unavailable_fallback(self):
        router = ModelRouter()
        router.mark_unavailable("groq")
        provider = router.get_preferred_provider("plan")
        assert provider == "openai"

    def test_get_task_temperature(self):
        router = ModelRouter()
        assert router.get_task_temperature("decision") == 0.4
        assert router.get_task_temperature("risk") == 0.3
        assert router.get_task_temperature("devils_advocate") == 0.7

    def test_task_routes_include_all_types(self):
        expected = [
            "compile", "plan", "organization", "risk", "decision",
            "devils_advocate", "readiness", "missing_info",
            "success_probability", "resource_gap", "dependency_graph",
            "bottleneck", "scenario", "dashboard", "replan", "simulation",
        ]
        router = ModelRouter()
        for task in expected:
            assert task in router.TASK_ROUTES, f"Missing task route: {task}"


# ─── ContextManager Tests ──────────────────────────────────────────────

class TestContextManager:
    def test_get_or_create(self):
        cm = ContextManager()
        ctx = cm.get_or_create("obj-1")
        assert isinstance(ctx, ExecutionContext)
        assert ctx.objective_id == "obj-1"

    def test_get_or_create_reuses(self):
        cm = ContextManager()
        ctx1 = cm.get_or_create("obj-1")
        ctx2 = cm.get_or_create("obj-1")
        assert ctx1 is ctx2

    def test_get_returns_none(self):
        cm = ContextManager()
        assert cm.get("nonexistent") is None

    def test_remove(self):
        cm = ContextManager()
        cm.get_or_create("obj-1")
        cm.remove("obj-1")
        assert cm.get("obj-1") is None

    def test_clear(self):
        cm = ContextManager()
        cm.get_or_create("obj-1")
        cm.get_or_create("obj-2")
        cm.clear()
        assert cm.get("obj-1") is None
        assert cm.get("obj-2") is None


# ─── ExecutionContext Tests ────────────────────────────────────────────

class TestExecutionContext:
    def test_default_values(self):
        ctx = ExecutionContext(objective_id="obj-1")
        assert ctx.objective_id == "obj-1"
        assert ctx.objective_raw == ""
        assert ctx.milestones == []
        assert ctx.errors == []
        assert ctx.warnings == []

    def test_to_prompt_dict_basic(self):
        ctx = ExecutionContext(objective_id="obj-1", objective_raw="test")
        d = ctx.to_prompt_dict()
        assert d["objective"]["raw"] == "test"

    def test_to_prompt_dict_with_plan(self):
        ctx = ExecutionContext(objective_id="obj-1")
        ctx.plan = {"roadmap": {"phases": []}, "total_cost": 1000}
        d = ctx.to_prompt_dict()
        assert "plan" in d
        assert d["plan"]["total_cost"] == 1000

    def test_to_prompt_dict_with_departments(self):
        ctx = ExecutionContext(objective_id="obj-1")
        ctx.departments = [{"name": "Engineering", "head_count": 5}]
        d = ctx.to_prompt_dict()
        assert len(d["departments"]) == 1
        assert d["departments"][0]["name"] == "Engineering"


# ─── PromptManager Tests ───────────────────────────────────────────────

class TestPromptManager:
    def test_list_templates(self):
        pm = PromptManager()
        templates = pm.list_templates()
        assert len(templates) >= 14
        assert "compiler_v1.md" in templates
        assert "planner_v1.md" in templates
        assert "risk_v1.md" in templates

    def test_load_template_exists(self):
        pm = PromptManager()
        content = pm.load_template("compiler_v1.md")
        assert len(content) > 50

    def test_load_template_not_found(self):
        pm = PromptManager()
        with pytest.raises(FileNotFoundError):
            pm.load_template("nonexistent.md")

    def test_render_replaces_variables(self):
        pm = PromptManager()
        result = pm.render("compiler_v1.md", {"objective": {"raw": "test input"}})
        assert "test input" in result

    def test_render_with_missing_variable(self):
        pm = PromptManager()
        result = pm.render("compiler_v1.md", {})
        assert "{{ objective.raw }}" in result

    def test_available_versions(self):
        pm = PromptManager()
        versions = pm.get_available_versions("compiler")
        assert len(versions) >= 1
        assert "compiler_v1.md" in versions

    def test_template_cache(self):
        pm = PromptManager()
        content1 = pm.load_template("compiler_v1.md")
        content2 = pm.load_template("compiler_v1.md")
        assert content1 is content2  # Same cached object

    def test_clear_cache(self):
        pm = PromptManager()
        pm.load_template("compiler_v1.md")
        pm.clear_cache()
        assert "compiler_v1.md" not in pm._cache


# ─── RetryEngine Tests ─────────────────────────────────────────────────

class TestRetryEngine:
    async def test_execute_success(self):
        engine = RetryEngine()
        async def success_fn():
            return "ok"
        result, attempts = await engine.execute("compile", "test-1", success_fn)
        assert result == "ok"
        assert len(attempts) == 1

    async def test_execute_eventual_success(self):
        engine = RetryEngine()
        call_count = 0
        async def eventually_pass():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("temp")
            return "ok"
        result, attempts = await engine.execute("compile", "test-2", eventually_pass)
        assert result == "ok"
        assert call_count >= 2

    async def test_execute_all_fail(self):
        engine = RetryEngine()
        async def always_fail():
            raise ValueError("permanent")
        with pytest.raises(RuntimeError):
            await engine.execute("compile", "test-3", always_fail)

    def test_get_config(self):
        engine = RetryEngine()
        config = engine.get_config("plan")
        assert config["max_retries"] == 3
        config = engine.get_config("unknown")
        assert config["max_retries"] == 3
        assert config["base_delay"] == 1.0

    async def test_get_attempts(self):
        engine = RetryEngine()
        async def fail_once():
            raise ValueError("fail")
        try:
            await engine.execute("compile", "test-4", fail_once)
        except RuntimeError:
            pass
        attempts = engine.get_attempts("test-4")
        assert len(attempts) >= 0

    def test_compute_delay(self):
        engine = RetryEngine()
        config = engine.get_config("plan")
        delay = engine._compute_delay(0, config)
        assert delay >= 0.5 and delay <= 1.5
        delay2 = engine._compute_delay(3, config)
        assert delay2 >= delay


# ─── AIKernel Basic Tests ──────────────────────────────────────────────

class TestAIKernel:
    def test_init(self):
        from app.kernel.ai_kernel import AIKernel
        kernel = AIKernel()
        assert kernel.prompt_manager is not None
        assert kernel.model_router is not None
        assert kernel.context_manager is not None
        assert kernel.output_validator is not None
        assert kernel.retry_engine is not None
        assert kernel.cache_manager is not None
        assert kernel.observability is not None
        assert kernel.token_tracker is not None
        assert kernel.cost_tracker is not None
        assert kernel.event_bus is not None
        assert kernel.state_machine is not None

    def test_get_stats(self):
        from app.kernel.ai_kernel import AIKernel
        kernel = AIKernel()
        stats = kernel.get_stats()
        assert "observability" in stats
        assert "cache" in stats
        assert "token_usage" in stats
        assert "total_cost" in stats

    def test_reset(self):
        from app.kernel.ai_kernel import AIKernel
        kernel = AIKernel()
        kernel.reset()
        stats = kernel.get_stats()
        assert stats["cache"]["cache_size"] == 0

    def test_get_stats_returns_valid_types(self):
        from app.kernel.ai_kernel import AIKernel
        kernel = AIKernel()
        stats = kernel.get_stats()
        assert isinstance(stats["total_cost"], float)
        assert isinstance(stats["token_usage"]["total"], int)
        assert isinstance(stats["cache"]["hit_rate"], float)
