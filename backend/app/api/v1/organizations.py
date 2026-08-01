from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tasks import OrganizationAgent
from app.database.session import get_session
from app.repositories.extensions_repository import DepartmentRepository, RoleRepository
from app.schemas import ApiResponse

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/objective/{objective_id}", response_model=ApiResponse)
async def get_organization(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    dept_repo = DepartmentRepository(session)
    role_repo = RoleRepository(session)
    departments = await dept_repo.list_by_objective(objective_id)
    result = []
    for dept in departments:
        roles = await role_repo.list_by_department(dept.id)
        result.append({
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
            "head_count": dept.head_count,
            "budget": dept.budget,
            "status": dept.status,
            "roles": [
                {"id": r.id, "title": r.title, "description": r.description,
                 "responsibilities": r.responsibilities, "required_skills": r.required_skills,
                 "hiring_order": r.hiring_order, "head_count": r.head_count, "status": r.status}
                for r in roles
            ],
        })
    total_head_count = sum(d.head_count or 0 for d in departments)
    return ApiResponse(data={
        "objective_id": objective_id,
        "departments": result,
        "total_head_count": total_head_count,
    })


@router.post("/objective/{objective_id}/generate", response_model=ApiResponse)
async def generate_organization(
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse:
    agent = OrganizationAgent(session)
    result = await agent.run(objective_id)
    return ApiResponse(data=result)
