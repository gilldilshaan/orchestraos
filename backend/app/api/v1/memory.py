from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.schemas import ApiResponse
from app.services.memory_retrieval import get_memory_context_for_agent, get_memory_context_for_planning
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memory", tags=["memory"])


# List memories with optional filtering and pagination
@router.get("")
async def list_memories(
    objective_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    result = await svc.list_memories(objective_id=objective_id, skip=skip, limit=limit)
    return ApiResponse(data=result)


# Retrieve a single memory
@router.get("/{memory_id}")
async def get_memory(
    memory_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    result = await svc.get_memory(memory_id)
    if result is None:
        return ApiResponse(data={"error": "Memory not found"})
    return ApiResponse(data=result)


# Create a new memory
@router.post("")
async def create_memory(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    objective_id = body.get("objective_id")
    if not objective_id:
        return ApiResponse(data={"error": "objective_id is required"})
    result = await svc.create_memory(body)
    return ApiResponse(data=result)


# Update an existing memory
@router.patch("/{memory_id}")
async def update_memory(
    memory_id: str,
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    result = await svc.update_memory(memory_id, body)
    if result is None:
        return ApiResponse(data={"error": "Memory not found"})
    return ApiResponse(data=result)


# Delete a memory
@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    success = await svc.delete_memory(memory_id)
    return ApiResponse(data={"deleted": success})


# Vector similarity search
@router.post("/search")
async def search_similar(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Semantic search.

    Accepts either an ``embedding`` (client-provided vector) or a ``query_text``
    (embedded server-side). Results are ordered by cosine similarity; each hit
    carries ``similarity_score`` and a full ``memory`` payload.
    """
    svc = MemoryService(session)
    query_text = body.get("query_text")
    embedding = body.get("embedding")
    objective_id = body.get("objective_id")
    limit = body.get("limit", 10)
    threshold = body.get("threshold", 0.0)

    if query_text:
        from app.services.memory_knowledge import MemoryKnowledgeService
        knowledge = MemoryKnowledgeService(session)
        result = await knowledge.search_by_text(
            query_text,
            limit=limit,
            threshold=threshold,
        )
        if objective_id:
            result["hits"] = [
                h for h in result["hits"]
                if h["memory"].get("objective_id") == objective_id
            ]
        return ApiResponse(data=result)

    if not embedding or not isinstance(embedding, list):
        return ApiResponse(data={"error": "embedding (list[float]) or query_text is required"})
    memories = await svc.search_similar(
        embedding=embedding,
        objective_id=objective_id,
        limit=limit,
        threshold=threshold,
    )
    hits = []
    for mem in memories:
        score = mem.pop("_similarity_score", 0.0)
        hits.append({"memory": mem, "similarity_score": score})
    return ApiResponse(data={"query": None, "hits": hits})


# Knowledge Center: analytics
@router.get("/analytics")
async def memory_analytics(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Enterprise analytics over organizational memory."""
    from app.services.memory_knowledge import MemoryKnowledgeService
    knowledge = MemoryKnowledgeService(session)
    return ApiResponse(data=await knowledge.analytics())


# Knowledge Center: timeline
@router.get("/timeline")
async def memory_timeline(
    search: str = Query(""),
    start_date: str = Query(""),
    end_date: str = Query(""),
    category: str = Query(""),
    department: str = Query(""),
    status: str = Query(""),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Lifecycle timeline of memories: created → retrieved → reused → updated → execution completed."""
    from app.services.memory_knowledge import MemoryKnowledgeService
    knowledge = MemoryKnowledgeService(session)
    return ApiResponse(data=await knowledge.timeline(
        search=search,
        start_date=start_date or None,
        end_date=end_date or None,
        category=category or None,
        department=department or None,
        status=status or None,
        skip=skip,
        limit=limit,
    ))


# Knowledge Center: graph
@router.get("/graph")
async def memory_graph(
    memory_limit: int = Query(80, ge=10, le=200),
    similarity_threshold: float = Query(0.55, ge=0.0, le=1.0),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Knowledge graph: objectives, strategies, lessons and their relationships."""
    from app.services.memory_knowledge import MemoryKnowledgeService
    knowledge = MemoryKnowledgeService(session)
    return ApiResponse(data=await knowledge.graph(
        memory_limit=memory_limit,
        similarity_threshold=similarity_threshold,
    ))


# Knowledge Center: global search
@router.get("/global-search")
async def memory_global_search(
    q: str = Query(""),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Search across objectives, strategies, lessons, risks, decisions and tags."""
    from app.services.memory_knowledge import MemoryKnowledgeService
    knowledge = MemoryKnowledgeService(session)
    return ApiResponse(data=await knowledge.global_search(q))


# Extract lessons for an objective
@router.get("/lessons/{objective_id}")
async def get_lessons(
    objective_id: str,
    min_confidence: float = Query(0.7, ge=0.0, le=1.0),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    result = await svc.extract_lessons(objective_id, min_confidence=min_confidence)
    return ApiResponse(data=result)


# Extract strategies for an objective
@router.get("/strategies/{objective_id}")
async def get_strategies(
    objective_id: str,
    min_confidence: float = Query(0.7, ge=0.0, le=1.0),
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    result = await svc.extract_strategies(objective_id, min_confidence=min_confidence)
    return ApiResponse(data=result)


# Get version history for a memory entry
@router.get("/{memory_id}/history")
async def get_history(
    memory_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    svc = MemoryService(session)
    result = await svc.get_history(memory_id)
    return ApiResponse(data=result)


# Get memory context for planning (Memory-Aware Planning)
@router.get("/context/planning/{objective_id}")
async def get_planning_context(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Retrieve organizational memory context for a new objective before planning begins."""
    from app.repositories.objective_repository import ObjectiveRepository
    obj_repo = ObjectiveRepository(session)
    objective = await obj_repo.get(objective_id)
    if not objective:
        return ApiResponse(data={"error": "Objective not found"})

    context = await get_memory_context_for_planning(
        session,
        objective.raw_input,
        objective_id,
    )
    return ApiResponse(data={
        "has_memories": len(context.similar_objectives) > 0,
        "similar_objectives": context.similar_objectives,
        "strategies": context.strategies,
        "lessons_learned": context.lessons_learned,
        "risks": context.risks,
        "executive_decisions": context.executive_decisions,
        "success_factors": context.success_factors,
        "memory_sources": context.memory_sources,
    })


# Generic memory context for any agent
@router.post("/context/agent")
async def get_agent_context(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    """Retrieve organizational memory context for any agent type."""
    query_text = body.get("query_text")
    agent_type = body.get("agent_type", "planner")
    objective_id = body.get("objective_id")
    limit = body.get("limit", 5)

    if not query_text:
        return ApiResponse(data={"error": "query_text is required"})

    context = await get_memory_context_for_agent(
        session,
        query_text,
        agent_type,
        objective_id,
        limit,
    )
    return ApiResponse(data={
        "has_memories": len(context.similar_objectives) > 0,
        "similar_objectives": context.similar_objectives,
        "strategies": context.strategies,
        "lessons_learned": context.lessons_learned,
        "risks": context.risks,
        "executive_decisions": context.executive_decisions,
        "success_factors": context.success_factors,
        "memory_sources": context.memory_sources,
    })
