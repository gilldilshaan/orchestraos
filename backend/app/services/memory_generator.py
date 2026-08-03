from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.memory import Memory
from app.repositories.memory_repository import MemoryRepository
from app.services.engine import DashboardAggregator
from app.services.memory_service import MemoryService

logger = logging.getLogger(__name__)


class MemoryGenerator:
    """Automatically generates organizational memory from completed pipeline executions."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._memory_service = MemoryService(session)
        self._repo = MemoryRepository(session)
        self._dashboard_aggregator = DashboardAggregator(session)

    async def generate_from_pipeline_completion(
        self,
        objective_id: str,
        completed_steps: List[str],
        results: List[Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Generate memory entry when a pipeline completes.

        Called from Orchestrator after pipeline finishes.
        """
        try:
            # 1. Gather comprehensive dashboard data
            dashboard = await self._dashboard_aggregator.get_dashboard(objective_id)

            # 2. Prepare context for memory extraction
            context = {
                "dashboard": dashboard,
                "completed_steps": completed_steps,
                "results_count": len(results),
            }

            # 3. Use AI kernel to extract structured memory
            logger.info("[MemoryGenerator] Extracting memory for objective %s", objective_id)
            extraction = await ai_kernel.run(
                task_type="memory_extraction",
                prompt_template="memory_extraction_v1.md",
                context=context,
                temperature=0.2,  # Low temperature for consistent extraction
            )

            # 4. Validate and structure the extraction
            structured = self._validate_extraction(extraction)

            # 5. Generate embedding from the combined content
            embedding_text = self._build_embedding_text(structured)
            embedding = await self._generate_embedding(embedding_text)

            # 6. Determine tags based on content
            tags = self._generate_tags(structured, dashboard)

            # 7. Calculate overall confidence
            confidence = structured.get("confidence", 0.7)

            # 8. Create memory entry
            memory_data = {
                "objective_id": objective_id,
                "embedding": embedding,
                "tags": tags,
                "confidence": confidence,
                "content": {
                    "summary": structured.get("summary"),
                    "decisions": structured.get("decisions", []),
                    "lessons_learned": structured.get("lessons_learned", []),
                    "risks": structured.get("risks", []),
                    "success_factors": structured.get("success_factors", []),
                    "strategy": structured.get("strategy"),
                },
                "history": [],
            }

            memory = await self._repo.create(**memory_data)
            logger.info("[MemoryGenerator] Created memory %s for objective %s", memory.id, objective_id)

            return self._memory_service._to_dict(memory)

        except Exception as e:
            logger.exception("[MemoryGenerator] Failed to generate memory for objective %s: %s", objective_id, e)
            return None

    async def generate_from_decision(
        self,
        objective_id: str,
        decision_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Generate a focused memory entry from a key decision."""
        try:
            context = {
                "decision": decision_data,
                "objective_id": objective_id,
            }

            extraction = await ai_kernel.run(
                task_type="memory_extraction",
                prompt_template="memory_extraction_v1.md",
                context=context,
                temperature=0.2,
            )

            structured = self._validate_extraction(extraction)

            # Merge with existing memory or create new
            existing = await self._repo.get_many(objective_id=objective_id, limit=1)
            if existing:
                memory = existing[0]
                # Update with new decision
                content = memory.content or {}
                content.setdefault("decisions", []).append({
                    "title": decision_data.get("title"),
                    "description": decision_data.get("recommendation"),
                    "impact": "high",
                    "outcome": decision_data.get("outcome", "pending"),
                })
                # Regenerate embedding
                embedding_text = self._build_embedding_text(structured)
                embedding = await self._generate_embedding(embedding_text)

                updated = await self._repo.update(memory.id, content=content, embedding=embedding)
                return self._memory_service._to_dict(updated) if updated else None
            else:
                # Create new focused memory
                return await self.generate_from_pipeline_completion(
                    objective_id, [], []
                )

        except Exception as e:
            logger.exception("[MemoryGenerator] Failed to generate memory from decision: %s", e)
            return None

    def _validate_extraction(self, extraction: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and provide defaults for extraction output."""
        defaults = {
            "summary": "Pipeline execution completed.",
            "decisions": [],
            "lessons_learned": [],
            "risks": [],
            "success_factors": [],
            "strategy": "Execute systematically with continuous monitoring.",
            "confidence": 0.5,
        }

        # Merge with defaults
        result = {**defaults, **extraction}

        # Ensure lists
        for key in ["decisions", "lessons_learned", "risks", "success_factors"]:
            if not isinstance(result.get(key), list):
                result[key] = []

        # Clamp confidence
        result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.5))))

        return result

    def _build_embedding_text(self, structured: Dict[str, Any]) -> str:
        """Build text representation for embedding generation."""
        parts = []

        if structured.get("summary"):
            parts.append(structured["summary"])

        if structured.get("strategy"):
            parts.append(f"Strategy: {structured['strategy']}")

        for lesson in structured.get("lessons_learned", []):
            if isinstance(lesson, dict) and lesson.get("lesson"):
                parts.append(f"Lesson: {lesson['lesson']}")

        for factor in structured.get("success_factors", []):
            if isinstance(factor, dict) and factor.get("factor"):
                parts.append(f"Success Factor: {factor['factor']}")

        return " ".join(parts)

    async def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding using local sentence-transformers model."""
        try:
            from app.llm.client import llm_client
            embeddings = await llm_client.aembed(text)
            return embeddings[0] if embeddings else None
        except Exception as e:
            logger.warning("[MemoryGenerator] Embedding generation failed: %s", e)
            return None

    def _generate_tags(
        self,
        structured: Dict[str, Any],
        dashboard: Dict[str, Any],
    ) -> List[str]:
        """Generate tags based on extraction and dashboard context."""
        tags = ["auto-generated"]

        # Add objective status tag
        obj_status = dashboard.get("objective", {}).get("status")
        if obj_status:
            tags.append(f"status:{obj_status}")

        # Add domain tags from risks/decisions
        risk_categories = set()
        for risk in structured.get("risks", []):
            if isinstance(risk, dict) and risk.get("title"):
                # Simple categorization
                title = risk["title"].lower()
                if any(w in title for w in ["budget", "cost", "financial"]):
                    risk_categories.add("financial")
                if any(w in title for w in ["timeline", "schedule", "delay"]):
                    risk_categories.add("timeline")
                if any(w in title for w in ["technical", "tech", "engineering", "architecture"]):
                    risk_categories.add("technical")
                if any(w in title for w in ["team", "people", "hiring", "staff"]):
                    risk_categories.add("team")

        tags.extend([f"risk:{c}" for c in risk_categories])

        # Add lessons/strategy tags
        if structured.get("lessons_learned"):
            tags.append("has-lessons")
        if structured.get("success_factors"):
            tags.append("has-success-factors")

        return tags


# Convenience function for orchestrator integration
async def generate_memory_on_pipeline_completion(
    session: AsyncSession,
    objective_id: str,
    completed_steps: List[str],
    results: List[Any],
) -> Optional[Dict[str, Any]]:
    """Entry point for orchestrator to generate memory after pipeline."""
    generator = MemoryGenerator(session)
    return await generator.generate_from_pipeline_completion(
        objective_id, completed_steps, results
    )