from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel.ai_kernel import AIKernel
from app.kernel.execution_engine import ExecutionEngine
from app.kernel.execution_planner import ExecutionPlanner
from app.kernel.reporting import OrganizationReport
from app.kernel.runtime_org_manager import RuntimeOrganizationManager
from app.schemas.dynamic_org import DynamicOrganizationStructure

DynamicOrgResult = dict[str, Any]


class OrganizationExecutor:
    """Delegates to ExecutionEngine — maps internal reports to expected format.

    The engine now produces typed reports (SpecialistReport, ExecutiveReport,
    OrganizationReport) internally.  This class extracts those and converts
    them to the backward-compatible dict format consumed by objective_compiler.
    """

    def __init__(
        self,
        session: AsyncSession,
        kernel: AIKernel,
    ) -> None:
        self._session = session
        self._kernel = kernel

    async def execute(
        self,
        objective_id: str,
        organization: DynamicOrganizationStructure,
    ) -> dict[str, Any]:
        manager = RuntimeOrganizationManager(
            objective_id,
            telemetry_bus=self._kernel.telemetry_bus,
        )
        manager.register_organization(organization)

        planner = ExecutionPlanner()
        plan = planner.plan(organization, manager)
        if not plan.is_valid:
            return {
                "error": "Invalid execution plan",
                "validation_errors": plan.validation_errors,
            }

        engine = ExecutionEngine(self._session, self._kernel)
        results = await engine.execute_plan(plan, manager, objective_id, organization)

        results_list: list[DynamicOrgResult] = []
        final_report: dict[str, Any] = {}
        org_report: OrganizationReport | None = results.organization_report

        for nr in results.node_results.values():
            entry: DynamicOrgResult = {
                "title": nr.title,
                "role_type": nr.node_type,
                "status": nr.status,
                "summary": nr.output.get("summary") if nr.output else None,
                "child_results": (
                    nr.output.get("child_results", [])
                    if nr.status == "completed" else []
                ),
                "executive_report": nr.output.get("executive_report"),
                "specialist_report": nr.output.get("specialist_report"),
            }

            if nr.node_type == "synthesis" and nr.status == "completed":
                final_report = nr.output
                org_report = nr.output.get("organization_report")

            results_list.append(entry)

        return {
            "organization": {
                "company_name": organization.company_name,
                "industry": organization.industry,
                "executives": [
                    {"title": e.title, "purpose": e.purpose}
                    for e in organization.executives
                ],
            },
            "results": results_list,
            "final_report": final_report,
            "organization_report": (
                org_report.model_dump() if isinstance(org_report, OrganizationReport)
                else org_report
            ),
            "executive_decision": results.executive_decision,
            "metrics": manager.get_metrics(),
        }
