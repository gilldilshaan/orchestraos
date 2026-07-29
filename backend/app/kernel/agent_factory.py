from __future__ import annotations

from app.kernel.runtime_executive import (
    SpecialistInstance,
    SpecialistRequest,
)


class AgentFactory:
    """Creates runtime specialist instances from executive requests.

    This factory does NOT:
      - Know about prompts, LLMs, or agents
      - Execute any AI calls
      - Know about the provider layer

    It produces SpecialistInstance objects that the OrganizationExecutor
    and DynamicAgent.execute_prompt() consume.

    Future: capability-based routing will match SpecialistRequest.capabilities
    against available specialist templates to select the best implementation.
    """

    def create_specialist(
        self,
        request: SpecialistRequest,
        executive_title: str,
    ) -> SpecialistInstance:
        """Create a single specialist instance from a request."""
        return SpecialistInstance(
            title=request.title,
            executive_title=executive_title,
            purpose=request.purpose,
            capabilities=list(request.required_capabilities),
            dependencies=list(request.dependencies),
            status="pending",
        )

    def create_specialists(
        self,
        requests: list[SpecialistRequest],
        executive_title: str,
    ) -> list[SpecialistInstance]:
        """Create multiple specialist instances from a list of requests."""
        return [
            self.create_specialist(req, executive_title)
            for req in requests
        ]

    def destroy_specialist(self, instance: SpecialistInstance) -> None:
        """Mark a specialist as destroyed (released).

        The caller (RuntimeOrganizationManager) is responsible for
        removing it from its registry.
        """
        instance.status = "destroyed"

    def destroy_all(self, instances: list[SpecialistInstance]) -> None:
        """Mark all given specialists as destroyed."""
        for inst in instances:
            self.destroy_specialist(inst)

    def get_specialist(
        self,
        title: str,
        instances: list[SpecialistInstance],
    ) -> SpecialistInstance | None:
        """Find a specialist by title within a given list."""
        for inst in instances:
            if inst.title == title:
                return inst
        return None

    def list_specialists(
        self,
        instances: list[SpecialistInstance],
        executive_title: str | None = None,
    ) -> list[SpecialistInstance]:
        """Filter a list of instances, optionally by executive."""
        if executive_title is None:
            return list(instances)
        return [
            s for s in instances
            if s.executive_title == executive_title
        ]
