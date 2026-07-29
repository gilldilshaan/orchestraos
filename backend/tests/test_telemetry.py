from __future__ import annotations

import pytest

from app.kernel.event_system import (
    EventMetadata,
    EventTimeline,
    EventType,
    ExecutionEvent,
    RunMetrics,
    TelemetryBus,
    make_event,
)


class TestEventType:
    def test_all_types_defined(self):
        expected = [
            "run.started",
            "objective.analyzed",
            "organization.created",
            "executive.created",
            "specialist.created",
            "task.planned",
            "task.started",
            "task.completed",
            "specialist_report.created",
            "executive_report.created",
            "supervisor_analysis.created",
            "decision.created",
            "run.completed",
            "run.failed",
            "node.retry",
            "node.cancelled",
        ]
        values = [e.value for e in EventType]
        for exp in expected:
            assert exp in values, f"Missing EventType: {exp}"

    def test_enum_is_str_enum(self):
        assert EventType.RUN_STARTED.value == "run.started"
        assert isinstance(EventType.RUN_STARTED, str)


class TestExecutionEvent:
    def test_create_minimal(self):
        event = ExecutionEvent(
            event_id="evt-1",
            run_id="run-1",
            timestamp="2026-01-01T00:00:00Z",
            event_type=EventType.RUN_STARTED,
            component="test",
        )
        assert event.event_id == "evt-1"
        assert event.run_id == "run-1"
        assert event.event_type == EventType.RUN_STARTED
        assert event.source is None
        assert event.target is None
        assert event.payload == {}
        assert isinstance(event.metadata, EventMetadata)

    def test_create_full(self):
        meta = EventMetadata(
            model_used="gpt-4o",
            token_count=150,
            latency_ms=1200.5,
            confidence=0.85,
        )
        event = ExecutionEvent(
            event_id="evt-2",
            run_id="run-1",
            timestamp="2026-01-01T00:00:00Z",
            event_type=EventType.TASK_COMPLETED,
            component="execution_engine",
            source="CTO",
            target="specialist",
            payload={"result": "ok"},
            metadata=meta,
        )
        assert event.source == "CTO"
        assert event.target == "specialist"
        assert event.payload == {"result": "ok"}
        assert event.metadata.model_used == "gpt-4o"
        assert event.metadata.confidence == 0.85


class TestMakeEvent:
    def test_make_event_generates_id(self):
        event = make_event(
            run_id="run-1",
            event_type=EventType.RUN_STARTED,
            component="test",
        )
        assert len(event.event_id) == 12
        assert event.run_id == "run-1"
        assert event.event_type == EventType.RUN_STARTED
        assert event.timestamp is not None

    def test_make_event_with_metadata(self):
        meta = EventMetadata(confidence=0.9)
        event = make_event(
            run_id="run-1",
            event_type=EventType.DECISION_CREATED,
            component="engine",
            source="CEO",
            payload={"decision": "approve"},
            metadata=meta,
        )
        assert event.source == "CEO"
        assert event.payload == {"decision": "approve"}
        assert event.metadata.confidence == 0.9


class TestEventTimeline:
    def test_empty_timeline(self):
        tl = EventTimeline()
        assert tl.get_events() == []
        assert tl.duration() == 0.0

    def test_append_and_get(self):
        tl = EventTimeline()
        e1 = make_event("run-1", EventType.RUN_STARTED, "test")
        e2 = make_event("run-1", EventType.RUN_COMPLETED, "test")
        tl.append(e1)
        tl.append(e2)
        assert len(tl.get_events()) == 2

    def test_filter_by_type(self):
        tl = EventTimeline()
        e1 = make_event("run-1", EventType.RUN_STARTED, "test")
        e2 = make_event("run-1", EventType.TASK_STARTED, "engine", source="CTO")
        e3 = make_event("run-1", EventType.TASK_COMPLETED, "engine", source="CTO")
        tl.append(e1)
        tl.append(e2)
        tl.append(e3)
        filtered = tl.filter(event_type=EventType.TASK_STARTED)
        assert len(filtered) == 1
        assert filtered[0].event_type == EventType.TASK_STARTED

    def test_filter_by_component(self):
        tl = EventTimeline()
        tl.append(make_event("run-1", EventType.RUN_STARTED, "manager"))
        tl.append(make_event("run-1", EventType.TASK_STARTED, "engine"))
        filtered = tl.filter(component="engine")
        assert len(filtered) == 1

    def test_filter_by_source(self):
        tl = EventTimeline()
        tl.append(make_event("run-1", EventType.TASK_STARTED, "engine", source="CTO"))
        tl.append(make_event("run-1", EventType.TASK_STARTED, "engine", source="CFO"))
        filtered = tl.filter(source="CTO")
        assert len(filtered) == 1

    def test_duration(self):
        tl = EventTimeline()
        t1 = "2026-01-01T00:00:00+00:00"
        t2 = "2026-01-01T01:30:00+00:00"
        tl.append(ExecutionEvent(
            event_id="e1", run_id="r1", timestamp=t1,
            event_type=EventType.RUN_STARTED, component="test",
        ))
        tl.append(ExecutionEvent(
            event_id="e2", run_id="r2", timestamp=t2,
            event_type=EventType.RUN_COMPLETED, component="test",
        ))
        assert tl.duration() == 5400.0

    def test_export_dict(self):
        tl = EventTimeline()
        tl.append(make_event("run-1", EventType.RUN_STARTED, "test"))
        exported = tl.export("dict")
        assert len(exported) == 1
        assert exported[0]["event_type"] == "run.started"
        assert exported[0]["run_id"] == "run-1"
        assert "timestamp" in exported[0]
        assert "metadata" in exported[0]

    def test_export_json(self):
        tl = EventTimeline()
        tl.append(make_event("run-1", EventType.RUN_STARTED, "test"))
        exported = tl.export("json")
        assert isinstance(exported, str)
        assert "run.started" in exported

    def test_export_invalid_format(self):
        tl = EventTimeline()
        tl.append(make_event("run-1", EventType.RUN_STARTED, "test"))
        with pytest.raises(ValueError, match="Unsupported export format"):
            tl.export("xml")


class TestRunMetrics:
    def test_defaults(self):
        m = RunMetrics()
        assert m.total_runtime == 0.0
        assert m.total_nodes == 0
        assert m.completed_nodes == 0
        assert m.failed_nodes == 0
        assert m.retry_count == 0

    def test_set_values(self):
        m = RunMetrics()
        m.total_runtime = 123.4
        m.total_nodes = 10
        m.completed_nodes = 8
        m.failed_nodes = 2
        m.retry_count = 3
        assert m.total_runtime == 123.4
        assert m.total_nodes == 10

    def test_to_dict(self):
        m = RunMetrics()
        m.total_runtime = 50.0
        m.executive_count = 3
        d = m.to_dict()
        assert d["total_runtime"] == 50.0
        assert d["executive_count"] == 3
        assert "specialist_count" in d
        assert "retry_count" in d

    def test_reset(self):
        m = RunMetrics()
        m.total_runtime = 100.0
        m.total_nodes = 20
        m.reset()
        assert m.total_runtime == 0.0
        assert m.total_nodes == 0


class TestTelemetryBus:
    async def test_publish_and_subscribe(self):
        bus = TelemetryBus()
        received: list[ExecutionEvent] = []

        async def handler(event: ExecutionEvent) -> None:
            received.append(event)

        bus.subscribe(EventType.RUN_STARTED, handler)
        event = make_event("run-1", EventType.RUN_STARTED, "test")
        await bus.publish(event)
        assert len(received) == 1
        assert received[0].event_id == event.event_id

    async def test_multiple_subscribers(self):
        bus = TelemetryBus()
        count = 0

        async def h1(_event: ExecutionEvent) -> None:
            nonlocal count
            count += 1

        async def h2(_event: ExecutionEvent) -> None:
            nonlocal count
            count += 1

        bus.subscribe(EventType.RUN_STARTED, h1)
        bus.subscribe(EventType.RUN_STARTED, h2)
        await bus.publish(make_event("run-1", EventType.RUN_STARTED, "test"))
        assert count == 2

    async def test_unsubscribe(self):
        bus = TelemetryBus()
        received: list[ExecutionEvent] = []

        async def handler(event: ExecutionEvent) -> None:
            received.append(event)

        bus.subscribe(EventType.RUN_STARTED, handler)
        bus.unsubscribe(EventType.RUN_STARTED, handler)
        await bus.publish(make_event("run-1", EventType.RUN_STARTED, "test"))
        assert len(received) == 0

    async def test_subscribe_all(self):
        bus = TelemetryBus()
        received: list[ExecutionEvent] = []

        async def handler(event: ExecutionEvent) -> None:
            received.append(event)

        bus.subscribe_all(handler)
        await bus.publish(make_event("run-1", EventType.RUN_STARTED, "test"))
        await bus.publish(make_event("run-1", EventType.TASK_STARTED, "engine"))
        assert len(received) == 2

    async def test_unsubscribe_all(self):
        bus = TelemetryBus()
        received: list[ExecutionEvent] = []

        async def handler(event: ExecutionEvent) -> None:
            received.append(event)

        bus.subscribe_all(handler)
        bus.unsubscribe_all(handler)
        await bus.publish(make_event("run-1", EventType.RUN_STARTED, "test"))
        assert len(received) == 0

    async def test_subscriber_error_does_not_block(self):
        bus = TelemetryBus()

        async def failing_handler(_event: ExecutionEvent) -> None:
            raise RuntimeError("fail")

        async def good_handler(event: ExecutionEvent) -> None:
            pass

        bus.subscribe(EventType.RUN_STARTED, failing_handler)
        bus.subscribe(EventType.RUN_STARTED, good_handler)
        await bus.publish(make_event("run-1", EventType.RUN_STARTED, "test"))

    async def test_typed_events_only(self):
        bus = TelemetryBus()
        received: list[ExecutionEvent] = []

        async def handler(event: ExecutionEvent) -> None:
            received.append(event)

        bus.subscribe(EventType.RUN_STARTED, handler)
        event = make_event("run-1", EventType.RUN_STARTED, "test")
        assert isinstance(event, ExecutionEvent)
        await bus.publish(event)
        assert len(received) == 1

    def test_clear(self):
        bus = TelemetryBus()

        async def handler(event: ExecutionEvent) -> None:
            pass

        bus.subscribe(EventType.RUN_STARTED, handler)
        bus.clear()
        assert len(bus._subscribers) == 0
        assert len(bus._wildcard_subscribers) == 0


class TestEventMetadata:
    def test_defaults(self):
        m = EventMetadata()
        assert m.model_used is None
        assert m.token_count == 0
        assert m.latency_ms == 0.0
        assert m.retry_attempt == 0
        assert m.confidence is None
        assert m.cost is None

    def test_set_values(self):
        m = EventMetadata(
            model_used="gpt-4o",
            prompt_version="v2",
            token_count=500,
            latency_ms=2500.0,
            retry_attempt=2,
            confidence=0.92,
            cost=0.015,
        )
        assert m.model_used == "gpt-4o"
        assert m.token_count == 500
        assert m.latency_ms == 2500.0
        assert m.retry_attempt == 2
        assert m.confidence == 0.92

    def test_partial_values(self):
        m = EventMetadata(confidence=0.75)
        assert m.confidence == 0.75
        assert m.model_used is None
        assert m.token_count == 0


class TestIntegrationTelemetryBusTimeline:
    async def test_bus_appends_to_timeline_when_wired(self):
        bus = TelemetryBus()
        tl = EventTimeline()

        async def record(event: ExecutionEvent) -> None:
            tl.append(event)

        bus.subscribe_all(record)
        event = make_event("run-1", EventType.RUN_STARTED, "test")
        await bus.publish(event)
        assert len(tl.get_events()) == 1
        assert tl.get_events()[0].event_id == event.event_id

    async def test_multiple_events_in_order(self):
        bus = TelemetryBus()
        tl = EventTimeline()

        async def record(event: ExecutionEvent) -> None:
            tl.append(event)

        bus.subscribe_all(record)
        events = [
            make_event("run-1", EventType.RUN_STARTED, "manager"),
            make_event("run-1", EventType.TASK_PLANNED, "planner"),
            make_event("run-1", EventType.RUN_COMPLETED, "manager"),
        ]
        for e in events:
            await bus.publish(e)
        assert len(tl.get_events()) == 3
        assert tl.get_events()[0].event_type == EventType.RUN_STARTED
        assert tl.get_events()[2].event_type == EventType.RUN_COMPLETED
