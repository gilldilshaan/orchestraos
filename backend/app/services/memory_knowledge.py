"""Knowledge Center service: analytics, timeline, graph, and global search
over organizational memory.

All reads are best-effort over persisted rows (memories, objectives, plans,
departments, decisions) — no mock data is ever synthesized.
"""

from __future__ import annotations

import hashlib
import logging
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.extensions import Decision, Department, Plan
from app.models.memory import Memory
from app.models.objective import Objective
from app.services.memory_service import MemoryService

logger = logging.getLogger(__name__)

COMPLETED_STATUSES = ("completed", "success", "succeeded")

EVENT_ORDER = {"execution_completed": 5, "reused": 4, "retrieved": 3, "updated": 2, "created": 1}


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _day(dt: datetime | None) -> str:
    return dt.date().isoformat() if dt else ""


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


def _category_from_tags(tags: list[str] | None) -> str:
    """Derive a coarse category from memory tags."""
    if not tags:
        return "general"
    for tag in tags:
        if tag.startswith("risk:"):
            return "risk"
    if "has-lessons" in tags:
        return "lessons"
    if "has-success-factors" in tags:
        return "success"
    for tag in tags:
        if tag.startswith("status:"):
            return "outcome"
    return "general"


def _status_from_tags(tags: list[str] | None) -> str:
    for tag in tags or []:
        if tag.startswith("status:"):
            return tag.split(":", 1)[1]
    return "completed"


class MemoryKnowledgeService:
    """Aggregations over the organizational memory store for the UI."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._memory_service = MemoryService(session)

    # -------------------------------------------------------------------------
    # Text-based vector search (server-side embedding)
    # -------------------------------------------------------------------------

    async def search_by_text(
        self,
        query_text: str,
        *,
        limit: int = 30,
        threshold: float = 0.0,
    ) -> dict[str, Any]:
        """Semantic search using the existing vector search, server-side embedding.

        Returns ``{query, hits: [{memory, similarity_score, departments, category}]}``
        sorted by similarity descending. Each hit has a ``memory`` payload that also
        carries ``_similarity_score`` for consumers that need the raw value.
        """
        from app.llm.client import llm_client

        if not query_text.strip():
            return {"query": query_text, "hits": []}

        embeddings = await llm_client.aembed(query_text)
        if not embeddings:
            return {"query": query_text, "hits": []}

        memories = await self._memory_service.search_similar(
            embedding=embeddings[0],
            limit=limit,
            threshold=threshold,
        )

        dept_map = await self._departments_by_objective()
        hits: list[dict[str, Any]] = []
        for mem in memories:
            score = mem.pop("_similarity_score", 0.0)
            hits.append({
                "memory": mem,
                "similarity_score": score,
                "departments": dept_map.get(mem.get("objective_id", ""), []),
                "category": _category_from_tags(mem.get("tags")),
            })

        return {"query": query_text, "hits": hits}

    # -------------------------------------------------------------------------
    # Analytics
    # -------------------------------------------------------------------------

    async def analytics(self) -> dict[str, Any]:
        memories = await self._memory_service._repo.list_all()
        objectives = await self._load_objectives()
        plans = await self._load_plans()

        total = len(memories)

        # ── Totals / averages ────────────────────────────────────────────────
        strategies = [m for m in memories if (m.content or {}).get("strategy")]
        lessons_count = sum(
            len((m.content or {}).get("lessons_learned", [])) or 0 for m in memories
        )
        confidences = [m.confidence for m in memories if m.confidence is not None]
        average_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # Average similarity: each memory's closest neighbor, averaged.
        average_similarity = self._avg_nearest_similarity(memories)

        # ── Reuse ────────────────────────────────────────────────────────────
        reused_ids = self._reused_memory_ids(memories, plans)
        reuse_rate = len(reused_ids) / total if total else 0.0

        # ── Planning improvement: confidence delta with vs without memory ----
        planning_improvement = self._planning_improvement(plans, objectives)

        # ── Rankings ─────────────────────────────────────────────────────────
        top_categories = self._top_categories(memories)
        top_tags = self._top_tags(memories)
        most_used_strategies = self._strategy_usage(memories)
        highest_confidence = self._highest_confidence(memories)
        most_retrieved = self._most_retrieved(memories)

        # ── Chart series ─────────────────────────────────────────────────────
        growth = self._growth_series(memories)
        category_distribution = [{"name": k, "value": v} for k, v in top_categories]
        confidence_trend = self._confidence_trend(memories)
        strategy_reuse_trend = self._reuse_trend(memories, plans)
        timeline = self._event_trend(memories, plans, objectives)

        return {
            "total_memories": total,
            "total_strategies": len(strategies),
            "total_lessons": lessons_count,
            "total_objectives": len(objectives),
            "total_decisions": len(await self._load_decision_rows()),
            "average_confidence": round(average_confidence, 4),
            "average_similarity": round(average_similarity, 4),
            "reuse_rate": round(reuse_rate, 4),
            "planning_improvement": round(planning_improvement, 4),
            "top_categories": [{"category": k, "count": v} for k, v in top_categories[:10]],
            "top_tags": [{"tag": k, "count": v} for k, v in top_tags[:12]],
            "most_used_strategies": most_used_strategies[:10],
            "highest_confidence_objectives": highest_confidence[:8],
            "most_retrieved_memories": most_retrieved[:8],
            "charts": {
                "memory_growth": growth,
                "category_distribution": category_distribution,
                "confidence_trend": confidence_trend,
                "strategy_reuse_trend": strategy_reuse_trend,
                "timeline": timeline,
            },
        }

    # -------------------------------------------------------------------------
    # Timeline
    # -------------------------------------------------------------------------

    async def timeline(
        self,
        *,
        search: str = "",
        start_date: str | None = None,
        end_date: str | None = None,
        category: str = "",
        department: str = "",
        status: str = "",
        skip: int = 0,
        limit: int = 100,
    ) -> dict[str, Any]:
        memories = await self._memory_service._repo.list_all()
        objectives = await self._load_objectives()
        plans = await self._load_plans()
        dept_map = await self._departments_by_objective()
        obj_map = {o.id: o for o in objectives}

        events: list[dict[str, Any]] = []

        def emit(
            event_type: str,
            timestamp: datetime | None,
            memory: Memory | None = None,
            objective_id: str | None = None,
            title: str = "",
            extra: dict[str, Any] | None = None,
        ) -> None:
            if timestamp is None:
                return
            objective = obj_map.get(objective_id or "")
            departments = dept_map.get(objective_id or "", [])
            mem_tags = (memory.tags if memory else None) or []
            ev = {
                "id": f"{event_type}:{memory.id if memory else objective_id}:{timestamp.isoformat()}",
                "type": event_type,
                "timestamp": _iso(timestamp),
                "title": title,
                "memory_id": memory.id if memory else None,
                "objective_id": objective_id or (memory.objective_id if memory else None),
            "objective_summary": (
                ((memory.content or {}) if memory else {}).get("summary", "")
                or (objective.compiled_summary if objective else None)
                or (objective.raw_input[:160] if objective else "")
            ),
                "department": departments,
                "category": _category_from_tags(mem_tags) if memory else "outcome",
                "status": (
                    _status_from_tags(mem_tags)
                    if memory and event_type != "execution_completed"
                    else "completed" if event_type == "execution_completed" else _status_from_tags(mem_tags)
                ),
                "confidence": memory.confidence if memory else None,
                "extra": extra or {},
            }
            events.append(ev)

        for memory in memories:
            content = memory.content or {}
            # created
            emit("created", memory.created_at, memory, title=content.get("summary", "Memory created"))
            # lifecycle history events
            for entry in memory.history or []:
                action = entry.get("action")
                try:
                    ts = datetime.fromisoformat(str(entry.get("timestamp")).replace("Z", "+00:00"))
                except Exception:
                    ts = None
                if action in ("retrieved", "reused", "updated") and ts:
                    label = {
                        "retrieved": "Memory retrieved by planner",
                        "reused": "Memory reused by a plan",
                        "updated": "Memory updated",
                    }[action]
                    emit(action, ts, memory, title=label, extra=entry.get("changes") or {})

        # execution completed events
        for objective in objectives:
            if objective.status in COMPLETED_STATUSES:
                emit(
                    "execution_completed",
                    objective.updated_at or objective.created_at,
                    objective_id=objective.id,
                    title="Execution completed",
                    extra={"status": objective.status},
                )

        # reuse events from plan metadata (backfill for plans created before history tracking)
        for plan in plans:
            meta = plan.metadata_ or {}
            refs = meta.get("memory_references") or []
            for ref in refs:
                if not isinstance(ref, dict):
                    continue
                memory_id = ref.get("memory_id")
                if not memory_id:
                    continue
                emit(
                    "reused",
                    plan.created_at,
                    objective_id=plan.objective_id,
                    title=f"Strategy reused: {ref.get('strategy_reused', 'memory reference')}",
                    extra={"memory_id": memory_id, "plan_id": plan.id},
                )

        # ── Filters ──────────────────────────────────────────────────────────
        if start_date:
            events = [e for e in events if (e["timestamp"] or "")[:10] >= start_date]
        if end_date:
            events = [e for e in events if (e["timestamp"] or "")[:10] <= end_date]
        if category:
            events = [e for e in events if e["category"] == category]
        if department:
            events = [e for e in events if department in e["department"]]
        if status:
            events = [e for e in events if e["status"] == status]
        if search:
            q = search.lower()
            events = [
                e for e in events
                if q in (e["title"] or "").lower()
                or q in (e["objective_summary"] or "").lower()
            ]

        events.sort(key=lambda e: (e["timestamp"] or "", EVENT_ORDER.get(e["type"], 0)), reverse=True)

        total_events = len(events)
        page = events[skip:skip + limit]
        return {"events": page, "total": total_events, "skip": skip, "limit": limit}

    # -------------------------------------------------------------------------
    # Knowledge graph
    # -------------------------------------------------------------------------

    async def graph(
        self,
        *,
        memory_limit: int = 80,
        similarity_threshold: float = 0.55,
    ) -> dict[str, Any]:
        memories = await self._memory_service._repo.list_all()
        # Keep the most recent memories for a bounded graph
        memories = sorted(memories, key=lambda m: m.created_at or datetime.min, reverse=True)[:memory_limit]
        plans = await self._load_plans()

        obj_nodes: dict[str, dict[str, Any]] = {}
        strat_nodes: dict[str, dict[str, Any]] = {}
        lesson_nodes: dict[str, dict[str, Any]] = {}
        edges: list[dict[str, Any]] = []
        edge_keys: set[tuple[str, str, str]] = set()

        def add_edge(source: str, target: str, etype: str, label: str = "", weight: float = 0.5) -> None:
            key = (source, target, etype)
            if key in edge_keys:
                return
            edge_keys.add(key)
            edges.append({
                "id": f"{etype}:{hashlib.md5(f'{source}{target}'.encode()).hexdigest()[:10]}",
                "source": source,
                "target": target,
                "type": etype,
                "label": label,
                "weight": round(weight, 3),
            })

        for memory in memories:
            content = memory.content or {}
            obj_key = f"objective:{memory.objective_id}"
            summary = content.get("summary") or "Untitled objective"
            obj_nodes[obj_key] = {
                "id": obj_key,
                "type": "objective",
                "label": summary,
                "objective_id": memory.objective_id,
                "memory_id": memory.id,
                "confidence": memory.confidence,
            }

            strategy = content.get("strategy")
            if strategy:
                sk = f"strategy:{hashlib.md5(strategy.lower().encode()).hexdigest()[:12]}"
                if sk not in strat_nodes:
                    strat_nodes[sk] = {"id": sk, "type": "strategy", "label": strategy, "count": 0}
                strat_nodes[sk]["count"] += 1
                add_edge(obj_key, sk, "derived_from", "derived from")

            for lesson in content.get("lessons_learned", []):
                if not isinstance(lesson, dict) or not lesson.get("lesson"):
                    continue
                lk = f"lesson:{hashlib.md5(lesson['lesson'].lower().encode()).hexdigest()[:12]}"
                if lk not in lesson_nodes:
                    lesson_nodes[lk] = {
                        "id": lk,
                        "type": "lesson",
                        "label": lesson["lesson"][:140],
                        "count": 0,
                    }
                lesson_nodes[lk]["count"] += 1
                add_edge(obj_key, lk, "derived_from", "derived from")

        # reuse edges: plan referencing another objective's memory
        memory_obj = {m.id: m for m in memories}
        for plan in plans:
            refs = (plan.metadata_ or {}).get("memory_references") or []
            for ref in refs:
                if not isinstance(ref, dict):
                    continue
                mem = memory_obj.get(ref.get("memory_id", ""))
                if mem is None or mem.objective_id == plan.objective_id:
                    continue
                add_edge(
                    f"objective:{mem.objective_id}",
                    f"objective:{plan.objective_id}",
                    "reuse",
                    f"reused in {ref.get('strategy_reused', 'plan')}",
                    weight=0.8,
                )

        # similarity edges between objectives (pairwise cosine, bounded)
        objective_memories: list[tuple[str, Memory]] = []
        for key, node in obj_nodes.items():
            memory = next((m for m in memories if m.id == node["memory_id"]), None)
            if memory and memory.embedding:
                objective_memories.append((key, memory))

        for i in range(len(objective_memories)):
            for j in range(i + 1, len(objective_memories)):
                a_key, a_mem = objective_memories[i]
                b_key, b_mem = objective_memories[j]
                sim = _cosine(a_mem.embedding or [], b_mem.embedding or [])
                if sim >= similarity_threshold:
                    add_edge(a_key, b_key, "similarity", "similar", weight=sim)

        nodes = list(obj_nodes.values()) + list(strat_nodes.values()) + list(lesson_nodes.values())
        return {"nodes": nodes, "edges": edges}

    # -------------------------------------------------------------------------
    # Global search
    # -------------------------------------------------------------------------

    async def global_search(self, q: str) -> dict[str, Any]:
        query = (q or "").strip()
        groups: dict[str, list[dict[str, Any]]] = {
            "objectives": [],
            "strategies": [],
            "lessons": [],
            "risks": [],
            "decisions": [],
            "tags": [],
            "memories": [],
        }
        if not query:
            return {"query": query, "groups": groups, "total": 0}

        ql = query.lower()
        memories = await self._memory_service._repo.list_all()
        objectives = await self._load_objectives()
        obj_map = {o.id: o for o in objectives}
        seen = {k: set() for k in groups}

        def push(group: str, item: dict[str, Any]) -> None:
            key = str(item.get("id") or item.get("title") or item.get("tag") or "")
            if key in seen[group]:
                return
            seen[group].add(key)
            groups[group].append(item)

        for memory in memories:
            content = memory.content or {}
            obj = obj_map.get(memory.objective_id)
            if obj:
                summary = (
                    content.get("summary") or obj.raw_input[:160]
                    if content.get("summary") or obj.raw_input
                    else content.get("summary") or ""
                )
            else:
                summary = content.get("summary") or ""

            # tags
            for tag in memory.tags or []:
                if ql in tag.lower():
                    push("tags", {
                        "id": f"tag:{memory.id}:{tag}",
                        "tag": tag,
                        "memory_id": memory.id,
                        "objective_id": memory.objective_id,
                        "objective_summary": summary,
                    })

            # objectives (summary / raw input)
            raw = obj.raw_input if obj else ""
            if ql in str(summary or "").lower() or ql in raw.lower():
                push("objectives", {
                    "id": f"objective:{memory.objective_id}",
                    "objective_id": memory.objective_id,
                    "memory_id": memory.id,
                    "title": summary or raw[:160],
                    "confidence": memory.confidence,
                    "created_at": _iso(memory.created_at),
                })

            # strategies
            if content.get("strategy") and ql in content["strategy"].lower():
                push("strategies", {
                    "id": f"strategy:{memory.id}",
                    "strategy": content["strategy"],
                    "objective_id": memory.objective_id,
                    "memory_id": memory.id,
                    "objective_summary": summary,
                })

            # lessons
            for lesson in content.get("lessons_learned", []):
                if isinstance(lesson, dict) and ql in str(lesson.get("lesson", "")).lower():
                    push("lessons", {
                        "id": f"lesson:{memory.id}:{lesson.get('lesson', '')[:60]}",
                        "lesson": lesson.get("lesson", ""),
                        "context": lesson.get("context", ""),
                        "objective_id": memory.objective_id,
                        "memory_id": memory.id,
                        "objective_summary": summary,
                    })

            # risks
            for risk in content.get("risks", []):
                if isinstance(risk, dict) and (
                    ql in str(risk.get("title", "")).lower()
                    or ql in str(risk.get("description", "")).lower()
                ):
                    push("risks", {
                        "id": f"risk:{memory.id}:{risk.get('title', '')[:60]}",
                        "title": risk.get("title", ""),
                        "description": risk.get("description", ""),
                        "mitigation": risk.get("mitigation", ""),
                        "materialized": risk.get("materialized", False),
                        "objective_id": memory.objective_id,
                        "memory_id": memory.id,
                        "objective_summary": summary,
                    })

            # decisions (from memory content)
            for decision in content.get("decisions", []):
                if isinstance(decision, dict) and (
                    ql in str(decision.get("title", "")).lower()
                    or ql in str(decision.get("description", "")).lower()
                ):
                    push("decisions", {
                        "id": f"decision:{memory.id}:{decision.get('title', '')[:60]}",
                        "title": decision.get("title", ""),
                        "description": decision.get("description", ""),
                        "impact": decision.get("impact", "medium"),
                        "objective_id": memory.objective_id,
                        "memory_id": memory.id,
                        "objective_summary": summary,
                    })

            # whole-memory match
            haystack = " ".join([
                summary or "",
                content.get("strategy", ""),
                " ".join(t for t in memory.tags or []),
            ]).lower()
            if ql in haystack:
                push("memories", {
                    "id": f"memory:{memory.id}",
                    "memory_id": memory.id,
                    "objective_id": memory.objective_id,
                    "title": summary or raw[:160],
                    "confidence": memory.confidence,
                    "created_at": _iso(memory.created_at),
                })

        # decisions table
        decision_rows = await self._load_decision_rows()
        for d in decision_rows:
            if ql in str(d.title or "").lower() or ql in str(d.recommendation or "").lower():
                push("decisions", {
                    "id": f"decision:{d.id}",
                    "title": d.title,
                    "description": d.recommendation or "",
                    "impact": d.status or "medium",
                    "objective_id": d.objective_id,
                    "objective_summary": obj_map[d.objective_id].raw_input[:160] if obj_map.get(d.objective_id) else "",
                })

        total = sum(len(v) for v in groups.values())
        return {"query": query, "groups": groups, "total": total}

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    async def _load_objectives(self) -> list[Objective]:
        result = await self._session.execute(
            select(Objective).where(Objective.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def _load_plans(self) -> list[Plan]:
        result = await self._session.execute(
            select(Plan).where(Plan.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def _load_departments(self) -> list[Department]:
        result = await self._session.execute(
            select(Department).where(Department.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def _load_decision_rows(self) -> list[Decision]:
        result = await self._session.execute(
            select(Decision).where(Decision.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def _departments_by_objective(self) -> dict[str, list[str]]:
        depts = await self._load_departments()
        mapping: dict[str, list[str]] = defaultdict(list)
        for d in depts:
            if d.objective_id:
                mapping[d.objective_id].append(d.name)
        return {k: sorted(set(v)) for k, v in mapping.items()}

    @staticmethod
    def _avg_nearest_similarity(memories: list[Memory]) -> float:
        embedded = [m for m in memories if m.embedding]
        if len(embedded) < 2:
            return 0.0
        # bound the computation
        embedded = embedded[:150]
        total = 0.0
        pairs = 0
        for i in range(len(embedded)):
            best = 0.0
            for j in range(len(embedded)):
                if i == j:
                    continue
                sim = _cosine(embedded[i].embedding or [], embedded[j].embedding or [])
                best = max(best, sim)
            total += best
            pairs += 1
        return total / pairs if pairs else 0.0

    @staticmethod
    def _reused_memory_ids(memories: list[Memory], plans: list[Plan]) -> set[str]:
        reused: set[str] = set()
        for memory in memories:
            for entry in memory.history or []:
                if entry.get("action") == "reused" and memory.id:
                    reused.add(memory.id)
            if ((memory.metadata_ or {}).get("usage_count") or 0) > 0:
                reused.add(memory.id)
        for plan in plans:
            for ref in (plan.metadata_ or {}).get("memory_references") or []:
                if isinstance(ref, dict) and ref.get("memory_id"):
                    reused.add(ref["memory_id"])
        return reused

    @staticmethod
    def _planning_improvement(plans: list[Plan], objectives: list[Objective]) -> float:
        obj_conf = {o.id: o.confidence for o in objectives if o.confidence is not None}
        with_memory: list[float] = []
        without_memory: list[float] = []
        for plan in plans:
            meta = plan.metadata_ or {}
            has_memory = bool(meta.get("memory_references")) or bool(meta.get("memory_context_used"))
            conf = obj_conf.get(plan.objective_id)
            if conf is None:
                continue
            (with_memory if has_memory else without_memory).append(conf)
        if not with_memory or not without_memory:
            return 0.0
        return (sum(with_memory) / len(with_memory)) - (sum(without_memory) / len(without_memory))

    @staticmethod
    def _top_categories(memories: list[Memory]) -> list[tuple[str, int]]:
        counts: Counter[str] = Counter()
        for m in memories:
            counts[_category_from_tags(m.tags)] += 1
        return counts.most_common()

    @staticmethod
    def _top_tags(memories: list[Memory]) -> list[tuple[str, int]]:
        counts: Counter[str] = Counter()
        for m in memories:
            for tag in m.tags or []:
                counts[tag] += 1
        return counts.most_common()

    @staticmethod
    def _strategy_usage(memories: list[Memory]) -> list[dict[str, Any]]:
        counts: Counter[str] = Counter()
        conf: dict[str, list[float]] = defaultdict(list)
        recent: dict[str, datetime] = {}
        for m in memories:
            strategy = (m.content or {}).get("strategy")
            if not strategy:
                continue
            key = strategy.strip()
            counts[key] += 1
            if m.confidence is not None:
                conf[key].append(m.confidence)
            if m.updated_at and (key not in recent or m.updated_at > recent[key]):
                recent[key] = m.updated_at
        result = []
        for key, count in counts.most_common():
            confs = conf.get(key, [])
            result.append({
                "strategy": key,
                "count": count,
                "avg_confidence": round(sum(confs) / len(confs), 3) if confs else 0,
                "last_used": _iso(recent.get(key)),
            })
        return result

    @staticmethod
    def _highest_confidence(memories: list[Memory]) -> list[dict[str, Any]]:
        ranked = [m for m in memories if m.confidence is not None]
        ranked.sort(key=lambda m: m.confidence or 0, reverse=True)
        return [
            {
                "objective_id": m.objective_id,
                "memory_id": m.id,
                "title": (m.content or {}).get("summary") or "Untitled",
                "confidence": m.confidence,
                "created_at": _iso(m.created_at),
            }
            for m in ranked
        ]

    @staticmethod
    def _most_retrieved(memories: list[Memory]) -> list[dict[str, Any]]:
        ranked = list(memories)
        ranked.sort(
            key=lambda m: (m.metadata_ or {}).get("usage_count", 0)
            or sum(1 for e in (m.history or []) if e.get("action") == "retrieved"),
            reverse=True,
        )
        return [
            {
                "objective_id": m.objective_id,
                "memory_id": m.id,
                "title": (m.content or {}).get("summary") or "Untitled",
                "usage_count": (m.metadata_ or {}).get("usage_count", 0)
                or sum(1 for e in (m.history or []) if e.get("action") == "retrieved"),
                "created_at": _iso(m.created_at),
            }
            for m in ranked
            if (m.metadata_ or {}).get("usage_count", 0) > 0
            or any(e.get("action") == "retrieved" for e in (m.history or []))
        ]

    @staticmethod
    def _growth_series(memories: list[Memory], days: int = 30) -> list[dict[str, Any]]:
        counts: Counter[str] = Counter()
        for m in memories:
            if m.created_at:
                counts[_day(m.created_at)] += 1
        series = []
        today = datetime.now(UTC).date()
        for offset in range(days - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            series.append({"date": day, "count": counts.get(day, 0)})
        return series

    @staticmethod
    def _confidence_trend(memories: list[Memory], days: int = 30) -> list[dict[str, Any]]:
        per_day: dict[str, list[float]] = defaultdict(list)
        for m in memories:
            if m.created_at and m.confidence is not None:
                per_day[_day(m.created_at)].append(m.confidence)
        series = []
        today = datetime.now(UTC).date()
        for offset in range(days - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            confs = per_day.get(day, [])
            series.append({
                "date": day,
                "confidence": round(sum(confs) / len(confs), 3) if confs else None,
                "count": len(confs),
            })
        return series

    @staticmethod
    def _reuse_trend(memories: list[Memory], plans: list[Plan], days: int = 30) -> list[dict[str, Any]]:
        counts: Counter[str] = Counter()
        for m in memories:
            for entry in m.history or []:
                if entry.get("action") == "reused" and entry.get("timestamp"):
                    try:
                        ts = datetime.fromisoformat(str(entry["timestamp"]).replace("Z", "+00:00"))
                        counts[_day(ts)] += 1
                    except Exception:
                        pass
        for plan in plans:
            if (plan.metadata_ or {}).get("memory_references") and plan.created_at:
                counts[_day(plan.created_at)] += 1
        series = []
        today = datetime.now(UTC).date()
        for offset in range(days - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            series.append({"date": day, "reuses": counts.get(day, 0)})
        return series

    @staticmethod
    def _event_trend(
        memories: list[Memory],
        plans: list[Plan],
        objectives: list[Objective],
        days: int = 30,
    ) -> list[dict[str, Any]]:
        counts: Counter[str] = Counter()
        for m in memories:
            if m.created_at:
                counts[_day(m.created_at)] += 1
            for entry in m.history or []:
                if entry.get("action") in ("retrieved", "reused", "updated") and entry.get("timestamp"):
                    try:
                        ts = datetime.fromisoformat(str(entry["timestamp"]).replace("Z", "+00:00"))
                        counts[_day(ts)] += 1
                    except Exception:
                        pass
        for plan in plans:
            if (plan.metadata_ or {}).get("memory_references") and plan.created_at:
                counts[_day(plan.created_at)] += 1
        for objective in objectives:
            if objective.status in COMPLETED_STATUSES and (objective.updated_at or objective.created_at):
                counts[_day(objective.updated_at or objective.created_at)] += 1
        series = []
        today = datetime.now(UTC).date()
        for offset in range(days - 1, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            series.append({"date": day, "events": counts.get(day, 0)})
        return series
