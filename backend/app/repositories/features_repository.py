from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.features import (
    Bottleneck,
    BusinessReadiness,
    DecisionMemoryEntry,
    DependencyGraph,
    DevilsAdvocateCritique,
    MissingInfoCheck,
    ResourceGap,
    SuccessProbability,
)
from app.repositories.base import BaseRepository


class BusinessReadinessRepository(BaseRepository[BusinessReadiness]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, BusinessReadiness)

    async def get_by_objective(self, objective_id: str) -> BusinessReadiness | None:
        stmt = select(BusinessReadiness).where(
            BusinessReadiness.objective_id == objective_id,
            BusinessReadiness.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class MissingInfoCheckRepository(BaseRepository[MissingInfoCheck]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, MissingInfoCheck)

    async def get_by_objective(self, objective_id: str) -> MissingInfoCheck | None:
        stmt = select(MissingInfoCheck).where(
            MissingInfoCheck.objective_id == objective_id,
            MissingInfoCheck.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class DevilsAdvocateRepository(BaseRepository[DevilsAdvocateCritique]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DevilsAdvocateCritique)

    async def get_by_objective(self, objective_id: str) -> list[DevilsAdvocateCritique]:
        stmt = (
            select(DevilsAdvocateCritique)
            .where(
                DevilsAdvocateCritique.objective_id == objective_id,
                DevilsAdvocateCritique.deleted_at.is_(None),
            )
            .order_by(DevilsAdvocateCritique.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_by_objective(
        self, objective_id: str
    ) -> DevilsAdvocateCritique | None:
        stmt = (
            select(DevilsAdvocateCritique)
            .where(
                DevilsAdvocateCritique.objective_id == objective_id,
                DevilsAdvocateCritique.deleted_at.is_(None),
            )
            .order_by(DevilsAdvocateCritique.created_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class SuccessProbabilityRepository(BaseRepository[SuccessProbability]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SuccessProbability)

    async def get_by_objective(self, objective_id: str) -> SuccessProbability | None:
        stmt = select(SuccessProbability).where(
            SuccessProbability.objective_id == objective_id,
            SuccessProbability.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class ResourceGapRepository(BaseRepository[ResourceGap]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ResourceGap)

    async def get_by_objective(self, objective_id: str) -> ResourceGap | None:
        stmt = select(ResourceGap).where(
            ResourceGap.objective_id == objective_id,
            ResourceGap.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class DependencyGraphRepository(BaseRepository[DependencyGraph]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DependencyGraph)

    async def get_by_objective(self, objective_id: str) -> DependencyGraph | None:
        stmt = select(DependencyGraph).where(
            DependencyGraph.objective_id == objective_id,
            DependencyGraph.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class BottleneckRepository(BaseRepository[Bottleneck]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Bottleneck)

    async def get_by_objective(self, objective_id: str) -> list[Bottleneck]:
        stmt = (
            select(Bottleneck)
            .where(
                Bottleneck.objective_id == objective_id,
                Bottleneck.deleted_at.is_(None),
            )
            .order_by(Bottleneck.detected_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Bottleneck]:
        stmt = (
            select(Bottleneck)
            .where(
                Bottleneck.objective_id == objective_id,
                Bottleneck.deleted_at.is_(None),
            )
            .order_by(Bottleneck.detected_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_active(
        self, *, skip: int = 0, limit: int = 100
    ) -> list[Bottleneck]:
        stmt = (
            select(Bottleneck)
            .where(
                Bottleneck.status == "active",
                Bottleneck.deleted_at.is_(None),
            )
            .order_by(Bottleneck.detected_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_severity(
        self, severity: str, *, skip: int = 0, limit: int = 100
    ) -> list[Bottleneck]:
        stmt = (
            select(Bottleneck)
            .where(
                Bottleneck.severity == severity,
                Bottleneck.deleted_at.is_(None),
            )
            .order_by(Bottleneck.detected_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_severity(self, objective_id: str) -> dict[str, int]:
        from sqlalchemy import func

        stmt = (
            select(Bottleneck.severity, func.count())
            .where(
                Bottleneck.objective_id == objective_id,
                Bottleneck.deleted_at.is_(None),
            )
            .group_by(Bottleneck.severity)
        )
        result = await self._session.execute(stmt)
        counts: dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for row in result.all():
            counts[row[0]] = row[1]
        return counts

    async def resolve(self, bottleneck_id: str) -> Bottleneck | None:
        from datetime import UTC, datetime

        return await self.update(bottleneck_id, {
            "status": "resolved",
            "resolved_at": datetime.now(UTC),
        })


class DecisionMemoryRepository(BaseRepository[DecisionMemoryEntry]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DecisionMemoryEntry)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[DecisionMemoryEntry]:
        stmt = (
            select(DecisionMemoryEntry)
            .where(
                DecisionMemoryEntry.objective_id == objective_id,
                DecisionMemoryEntry.deleted_at.is_(None),
            )
            .order_by(DecisionMemoryEntry.decision_date.desc().nulls_last(),
                      DecisionMemoryEntry.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_all(
        self, *, skip: int = 0, limit: int = 100
    ) -> list[DecisionMemoryEntry]:
        stmt = (
            select(DecisionMemoryEntry)
            .where(DecisionMemoryEntry.deleted_at.is_(None))
            .order_by(DecisionMemoryEntry.decision_date.desc().nulls_last(),
                      DecisionMemoryEntry.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
