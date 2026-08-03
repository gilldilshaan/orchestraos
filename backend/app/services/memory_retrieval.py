from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.memory import Memory
from app.repositories.memory_repository import MemoryRepository
from app.services.memory_service import MemoryService

logger = logging.getLogger(__name__)


@dataclass
class RetrievedMemory:
    """A retrieved memory with ranking metadata."""
    memory: Dict[str, Any]
    similarity_score: float
    memory_confidence: float
    success_confidence: float
    recency_score: float
    composite_score: float


@dataclass
class MemoryContext:
    """Context package built from retrieved memories for agent consumption."""
    similar_objectives: List[Dict[str, Any]]
    strategies: List[str]
    lessons_learned: List[Dict[str, Any]]
    risks: List[Dict[str, Any]]
    executive_decisions: List[Dict[str, Any]]
    success_factors: List[Dict[str, Any]]
    memory_sources: List[Dict[str, Any]]  # For reporting


class MemoryRetrievalService:
    """
    Service for retrieving relevant organizational memories for a given query.
    
    Designed to be reusable by any agent (Planner, Finance, Marketing, Risk, CEO, etc.)
    without code duplication.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._memory_service = MemoryService(session)
        self._repo = MemoryRepository(session)

    async def search_relevant_memories(
        self,
        query_text: str,
        objective_id: Optional[str] = None,
        limit: int = 10,
        similarity_threshold: float = 0.6,
    ) -> List[RetrievedMemory]:
        """
        Search for memories relevant to the query text.
        
        Uses semantic similarity via embeddings, then ranks by composite score.
        """
        # Generate embedding for query
        from app.llm.client import llm_client
        query_embeddings = await llm_client.aembed(query_text)
        if not query_embeddings:
            return []
        query_embedding = query_embeddings[0]

        # Search memories using vector similarity
        memories = await self._memory_service.search_similar(
            embedding=query_embedding,
            objective_id=objective_id,
            limit=limit * 2,  # Get more for ranking
            threshold=similarity_threshold,
        )

        if not memories:
            return []

        # Rank by composite score
        ranked = self._rank_memories(memories, query_embedding)
        return ranked[:limit]

    def _rank_memories(
        self,
        memories: List[Dict[str, Any]],
        query_embedding: List[float],
    ) -> List[RetrievedMemory]:
        """Rank memories by composite score: similarity, confidence, success, recency."""
        ranked = []
        now = datetime.utcnow()

        for mem in memories:
            # Similarity score (already computed in search_similar)
            similarity = mem.get("_similarity_score", 0.0)
            if "_similarity_score" in mem:
                del mem["_similarity_score"]  # Clean up internal field

            # Memory confidence (from extraction)
            memory_confidence = mem.get("confidence", 0.5)

            # Success confidence - derived from objective status if available
            # We'll infer from content or use a default
            content = mem.get("content", {})
            success_confidence = self._estimate_success_confidence(content)

            # Recency score (exponential decay, half-life ~90 days)
            created_at = mem.get("created_at")
            if created_at and isinstance(created_at, str):
                try:
                    created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    days_old = (now - created_dt.replace(tzinfo=None)).days
                    recency_score = max(0.1, 2 ** (-days_old / 90))
                except Exception:
                    recency_score = 0.5
            else:
                recency_score = 0.5

            # Composite score (weighted)
            composite = (
                0.40 * similarity +
                0.20 * memory_confidence +
                0.20 * success_confidence +
                0.20 * recency_score
            )

            ranked.append(RetrievedMemory(
                memory=mem,
                similarity_score=similarity,
                memory_confidence=memory_confidence,
                success_confidence=success_confidence,
                recency_score=recency_score,
                composite_score=composite,
            ))

        # Sort by composite score descending
        ranked.sort(key=lambda x: x.composite_score, reverse=True)
        return ranked

    def _estimate_success_confidence(self, content: Dict[str, Any]) -> float:
        """Estimate success confidence from memory content."""
        # Look for indicators of successful completion
        factors = []

        # High confidence in extraction suggests good memory
        if content.get("confidence", 0) > 0.7:
            factors.append(0.8)

        # Success factors present
        if content.get("success_factors"):
            factors.append(0.7)

        # Lessons learned implies reflection
        if content.get("lessons_learned"):
            factors.append(0.6)

        # Strategy present
        if content.get("strategy"):
            factors.append(0.6)

        # Risks identified and mitigated
        risks = content.get("risks", [])
        mitigated = sum(1 for r in risks if isinstance(r, dict) and r.get("mitigation"))
        if mitigated > 0:
            factors.append(0.6 + 0.1 * min(mitigated, 3))

        return sum(factors) / len(factors) if factors else 0.5

    async def build_context_for_planning(
        self,
        objective_raw: str,
        objective_id: Optional[str] = None,
        max_memories: int = 5,
        record_events: bool = False,
    ) -> MemoryContext:
        """
        Build a complete memory context package for the planner.
        
        This is the main entry point for Memory-Aware Planning.
        """
        # Search for relevant memories
        retrieved = await self.search_relevant_memories(
            query_text=objective_raw,
            objective_id=objective_id,
            limit=max_memories,
            similarity_threshold=0.55,
        )

        if not retrieved:
            return MemoryContext(
                similar_objectives=[],
                strategies=[],
                lessons_learned=[],
                risks=[],
                executive_decisions=[],
                success_factors=[],
                memory_sources=[],
            )

        # Record retrieval events for the knowledge timeline (best-effort)
        if record_events:
            for rm in retrieved:
                await self._memory_service.record_event(
                    rm.memory.get("id", ""),
                    "retrieved",
                    {
                        "actor": "planner",
                        "context": objective_raw[:300],
                        "objective_id": objective_id,
                        "similarity_score": round(rm.similarity_score, 3),
                    },
                )

        # Extract and deduplicate content
        strategies = []
        lessons = []
        risks = []
        decisions = []
        success_factors = []
        similar_objectives = []
        memory_sources = []

        for rm in retrieved:
            mem = rm.memory
            content = mem.get("content", {})

            # Build memory source for reporting
            memory_sources.append({
                "memory_id": mem.get("id"),
                "objective_id": mem.get("objective_id"),
                "similarity_score": round(rm.similarity_score, 3),
                "memory_confidence": round(rm.memory_confidence, 3),
                "success_confidence": round(rm.success_confidence, 3),
                "recency_score": round(rm.recency_score, 3),
                "composite_score": round(rm.composite_score, 3),
                "summary": content.get("summary", "")[:200],
            })

            similar_objectives.append({
                "objective_id": mem.get("objective_id"),
                "summary": content.get("summary", ""),
                "similarity_score": round(rm.similarity_score, 3),
                "strategy": content.get("strategy", ""),
            })

            # Collect strategies
            if content.get("strategy"):
                strategies.append(content["strategy"])

            # Collect lessons
            for lesson in content.get("lessons_learned", []):
                if isinstance(lesson, dict) and lesson.get("lesson"):
                    lessons.append({
                        "lesson": lesson["lesson"],
                        "context": lesson.get("context", ""),
                        "source_objective_id": mem.get("objective_id"),
                        "similarity_score": round(rm.similarity_score, 3),
                    })

            # Collect risks
            for risk in content.get("risks", []):
                if isinstance(risk, dict) and risk.get("title"):
                    risks.append({
                        "title": risk["title"],
                        "description": risk.get("description", ""),
                        "materialized": risk.get("materialized", False),
                        "mitigation": risk.get("mitigation", ""),
                        "source_objective_id": mem.get("objective_id"),
                        "similarity_score": round(rm.similarity_score, 3),
                    })

            # Collect decisions
            for decision in content.get("decisions", []):
                if isinstance(decision, dict) and decision.get("title"):
                    decisions.append({
                        "title": decision["title"],
                        "description": decision.get("description", ""),
                        "impact": decision.get("impact", "medium"),
                        "outcome": decision.get("outcome", ""),
                        "source_objective_id": mem.get("objective_id"),
                        "similarity_score": round(rm.similarity_score, 3),
                    })

            # Collect success factors
            for factor in content.get("success_factors", []):
                if isinstance(factor, dict) and factor.get("factor"):
                    success_factors.append({
                        "factor": factor["factor"],
                        "evidence": factor.get("evidence", ""),
                        "reproducibility": factor.get("reproducibility", "medium"),
                        "source_objective_id": mem.get("objective_id"),
                        "similarity_score": round(rm.similarity_score, 3),
                    })

        # Deduplicate by content similarity (simple string-based)
        def dedupe(items: List[Dict], key: str) -> List[Dict]:
            seen = set()
            result = []
            for item in items:
                val = item.get(key, "").lower()[:100]
                if val not in seen:
                    seen.add(val)
                    result.append(item)
            return result

        return MemoryContext(
            similar_objectives=dedupe(similar_objectives, "summary"),
            strategies=list(set(strategies))[:5],
            lessons_learned=dedupe(lessons, "lesson")[:10],
            risks=dedupe(risks, "title")[:10],
            executive_decisions=dedupe(decisions, "title")[:10],
            success_factors=dedupe(success_factors, "factor")[:10],
            memory_sources=memory_sources,
        )


async def get_memory_context_for_planning(
    session: AsyncSession,
    objective_raw: str,
    objective_id: Optional[str] = None,
    record_events: bool = False,
) -> MemoryContext:
    """Convenience function for planner integration."""
    service = MemoryRetrievalService(session)
    return await service.build_context_for_planning(
        objective_raw,
        objective_id,
        record_events=record_events,
    )


async def get_memory_context_for_agent(
    session: AsyncSession,
    query_text: str,
    agent_type: str,
    objective_id: Optional[str] = None,
    limit: int = 5,
) -> MemoryContext:
    """
    Generic memory context retrieval for any agent type.
    
    Args:
        session: Database session
        query_text: Text to search for (objective, question, etc.)
        agent_type: Type of agent ("planner", "finance", "marketing", "risk", "ceo", etc.)
        objective_id: Optional current objective to exclude from results
        limit: Maximum memories to retrieve
    
    Returns:
        MemoryContext tailored for the agent
    """
    service = MemoryRetrievalService(session)
    
    # Could customize search per agent type in future
    retrieved = await service.search_relevant_memories(
        query_text=query_text,
        objective_id=objective_id,
        limit=limit,
    )

    if not retrieved:
        return MemoryContext([], [], [], [], [], [], [])

    # Build context (same logic, could be customized per agent)
    strategies = []
    lessons = []
    risks = []
    decisions = []
    success_factors = []
    similar_objectives = []
    memory_sources = []

    for rm in retrieved:
        mem = rm.memory
        content = mem.get("content", {})

        memory_sources.append({
            "memory_id": mem.get("id"),
            "objective_id": mem.get("objective_id"),
            "similarity_score": round(rm.similarity_score, 3),
            "composite_score": round(rm.composite_score, 3),
            "summary": content.get("summary", "")[:200],
        })

        similar_objectives.append({
            "objective_id": mem.get("objective_id"),
            "summary": content.get("summary", ""),
            "similarity_score": round(rm.similarity_score, 3),
        })

        if content.get("strategy"):
            strategies.append(content["strategy"])

        for lesson in content.get("lessons_learned", []):
            if isinstance(lesson, dict) and lesson.get("lesson"):
                lessons.append({
                    "lesson": lesson["lesson"],
                    "context": lesson.get("context", ""),
                    "source_objective_id": mem.get("objective_id"),
                })

        for risk in content.get("risks", []):
            if isinstance(risk, dict) and risk.get("title"):
                risks.append({
                    "title": risk["title"],
                    "description": risk.get("description", ""),
                    "mitigation": risk.get("mitigation", ""),
                    "source_objective_id": mem.get("objective_id"),
                })

        for decision in content.get("decisions", []):
            if isinstance(decision, dict) and decision.get("title"):
                decisions.append({
                    "title": decision["title"],
                    "description": decision.get("description", ""),
                    "impact": decision.get("impact", "medium"),
                    "outcome": decision.get("outcome", ""),
                    "source_objective_id": mem.get("objective_id"),
                })

        for factor in content.get("success_factors", []):
            if isinstance(factor, dict) and factor.get("factor"):
                success_factors.append({
                    "factor": factor["factor"],
                    "evidence": factor.get("evidence", ""),
                    "reproducibility": factor.get("reproducibility", "medium"),
                    "source_objective_id": mem.get("objective_id"),
                })

    def dedupe(items: List[Dict], key: str) -> List[Dict]:
        seen = set()
        result = []
        for item in items:
            val = item.get(key, "").lower()[:100]
            if val not in seen:
                seen.add(val)
                result.append(item)
        return result

    return MemoryContext(
        similar_objectives=dedupe(similar_objectives, "summary")[:5],
        strategies=list(set(strategies))[:5],
        lessons_learned=dedupe(lessons, "lesson")[:10],
        risks=dedupe(risks, "title")[:10],
        executive_decisions=dedupe(decisions, "title")[:10],
        success_factors=dedupe(success_factors, "factor")[:10],
        memory_sources=memory_sources,
    )