from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.extensions import (
    Decision,
    DecisionOption,
    Department,
    Explanation,
    KPI,
    KnowledgeGraphEdge,
    Milestone,
    ObjectiveCompilation,
    Plan,
    PlanVersion,
    Risk,
    Role,
    Scenario,
)
from app.repositories.base import BaseRepository


class PlanRepository(BaseRepository[Plan]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Plan)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Plan]:
        stmt = (
            select(Plan)
            .where(
                Plan.objective_id == objective_id,
                Plan.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_status(
        self, status: str, *, skip: int = 0, limit: int = 100
    ) -> list[Plan]:
        stmt = (
            select(Plan)
            .where(
                Plan.status == status,
                Plan.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_active_plan(self, objective_id: str) -> Plan | None:
        stmt = (
            select(Plan)
            .where(
                Plan.objective_id == objective_id,
                Plan.status == "active",
                Plan.deleted_at.is_(None),
            )
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class PlanVersionRepository(BaseRepository[PlanVersion]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PlanVersion)

    async def list_by_plan(
        self, plan_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[PlanVersion]:
        stmt = (
            select(PlanVersion)
            .where(
                PlanVersion.plan_id == plan_id,
                PlanVersion.deleted_at.is_(None),
            )
            .order_by(PlanVersion.version_number.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_version(self, plan_id: str) -> PlanVersion | None:
        stmt = (
            select(PlanVersion)
            .where(
                PlanVersion.plan_id == plan_id,
                PlanVersion.deleted_at.is_(None),
            )
            .order_by(PlanVersion.version_number.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class ObjectiveCompilationRepository(BaseRepository[ObjectiveCompilation]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ObjectiveCompilation)

    async def get_by_objective(self, objective_id: str) -> ObjectiveCompilation | None:
        stmt = select(ObjectiveCompilation).where(
            ObjectiveCompilation.objective_id == objective_id,
            ObjectiveCompilation.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class MilestoneRepository(BaseRepository[Milestone]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Milestone)

    async def list_by_plan(
        self, plan_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Milestone]:
        stmt = (
            select(Milestone)
            .where(
                Milestone.plan_id == plan_id,
                Milestone.deleted_at.is_(None),
            )
            .order_by(Milestone.order.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_status(
        self, status: str, *, skip: int = 0, limit: int = 100
    ) -> list[Milestone]:
        stmt = (
            select(Milestone)
            .where(
                Milestone.status == status,
                Milestone.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class DepartmentRepository(BaseRepository[Department]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Department)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Department]:
        stmt = (
            select(Department)
            .where(
                Department.objective_id == objective_id,
                Department.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Role)

    async def list_by_department(
        self, department_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Role]:
        stmt = (
            select(Role)
            .where(
                Role.department_id == department_id,
                Role.deleted_at.is_(None),
            )
            .order_by(Role.hiring_order.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class RiskRepository(BaseRepository[Risk]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Risk)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Risk]:
        stmt = (
            select(Risk)
            .where(
                Risk.objective_id == objective_id,
                Risk.deleted_at.is_(None),
            )
            .order_by(Risk.risk_score.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_risk_level(
        self, risk_level: str, *, skip: int = 0, limit: int = 100
    ) -> list[Risk]:
        stmt = (
            select(Risk)
            .where(
                Risk.risk_level == risk_level,
                Risk.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_risk_level(self, objective_id: str) -> dict[str, int]:
        from sqlalchemy import func

        stmt = (
            select(Risk.risk_level, func.count())
            .where(
                Risk.objective_id == objective_id,
                Risk.deleted_at.is_(None),
            )
            .group_by(Risk.risk_level)
        )
        result = await self._session.execute(stmt)
        counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for row in result.all():
            counts[row[0]] = row[1]
        return counts


class DecisionRepository(BaseRepository[Decision]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Decision)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Decision]:
        stmt = (
            select(Decision)
            .where(
                Decision.objective_id == objective_id,
                Decision.deleted_at.is_(None),
            )
            .order_by(Decision.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_status(
        self, status: str, *, skip: int = 0, limit: int = 100
    ) -> list[Decision]:
        stmt = (
            select(Decision)
            .where(
                Decision.status == status,
                Decision.deleted_at.is_(None),
            )
            .order_by(Decision.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_pending(
        self, *, skip: int = 0, limit: int = 50
    ) -> list[Decision]:
        stmt = (
            select(Decision)
            .where(
                Decision.status == "PENDING",
                Decision.deleted_at.is_(None),
            )
            .order_by(Decision.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_status(self) -> dict[str, int]:
        from sqlalchemy import func

        stmt = select(Decision.status, func.count()).where(
            Decision.deleted_at.is_(None)
        ).group_by(Decision.status)
        result = await self._session.execute(stmt)
        counts = {"PENDING": 0, "APPROVED": 0, "REJECTED": 0, "UNDER_REVIEW": 0}
        for row in result.all():
            counts[row[0]] = row[1]
        return counts


class DecisionOptionRepository(BaseRepository[DecisionOption]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DecisionOption)

    async def list_by_decision(
        self, decision_id: str
    ) -> list[DecisionOption]:
        stmt = select(DecisionOption).where(
            DecisionOption.decision_id == decision_id,
            DecisionOption.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class ExplanationRepository(BaseRepository[Explanation]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Explanation)

    async def list_by_entity(
        self, entity_type: str, entity_id: str, *, skip: int = 0, limit: int = 50
    ) -> list[Explanation]:
        stmt = (
            select(Explanation)
            .where(
                Explanation.entity_type == entity_type,
                Explanation.entity_id == entity_id,
                Explanation.deleted_at.is_(None),
            )
            .order_by(Explanation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class ScenarioRepository(BaseRepository[Scenario]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Scenario)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Scenario]:
        stmt = (
            select(Scenario)
            .where(
                Scenario.objective_id == objective_id,
                Scenario.deleted_at.is_(None),
            )
            .order_by(Scenario.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class KnowledgeGraphRepository(BaseRepository[KnowledgeGraphEdge]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, KnowledgeGraphEdge)

    async def find_by_source(
        self, source_type: str, source_id: str
    ) -> list[KnowledgeGraphEdge]:
        stmt = select(KnowledgeGraphEdge).where(
            KnowledgeGraphEdge.source_type == source_type,
            KnowledgeGraphEdge.source_id == source_id,
            KnowledgeGraphEdge.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_by_target(
        self, target_type: str, target_id: str
    ) -> list[KnowledgeGraphEdge]:
        stmt = select(KnowledgeGraphEdge).where(
            KnowledgeGraphEdge.target_type == target_type,
            KnowledgeGraphEdge.target_id == target_id,
            KnowledgeGraphEdge.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_connected(
        self, entity_type: str, entity_id: str
    ) -> list[KnowledgeGraphEdge]:
        stmt = select(KnowledgeGraphEdge).where(
            (
                (KnowledgeGraphEdge.source_type == entity_type)
                & (KnowledgeGraphEdge.source_id == entity_id)
            )
            | (
                (KnowledgeGraphEdge.target_type == entity_type)
                & (KnowledgeGraphEdge.target_id == entity_id)
            ),
            KnowledgeGraphEdge.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_by_relationship(
        self, relationship_type: str
    ) -> list[KnowledgeGraphEdge]:
        stmt = select(KnowledgeGraphEdge).where(
            KnowledgeGraphEdge.relationship_type == relationship_type,
            KnowledgeGraphEdge.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class KPIRepository(BaseRepository[KPI]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, KPI)

    async def list_by_entity(
        self, entity_type: str, entity_id: str
    ) -> list[KPI]:
        stmt = select(KPI).where(
            KPI.entity_type == entity_type,
            KPI.entity_id == entity_id,
            KPI.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())