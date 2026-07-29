from __future__ import annotations

from collections import deque
from typing import Any

from pydantic import BaseModel, Field

from app.kernel.runtime_org_manager import RuntimeOrganizationManager
from app.schemas.dynamic_org import DynamicOrganizationStructure


class ExecutionNode(BaseModel):
    """A single unit of work in the execution graph.

    Each node represents either an executive (initial analysis),
    a specialist (domain-specific task), or the CEO synthesis step.
    """

    id: str
    title: str
    owner: str  # executive title or "ceo" for synthesis
    node_type: str  # "executive" | "specialist" | "synthesis"
    assigned_specialist: str | None = None
    dependencies: list[str] = Field(default_factory=list)
    priority: int = 5  # 1-10, higher = more important
    estimated_complexity: str = "medium"  # "low" | "medium" | "high"
    execution_status: str = "pending"
    metadata: dict[str, Any] = Field(default_factory=dict)

    def is_ready(self, completed: set[str]) -> bool:
        """Check if all dependencies are satisfied."""
        if self.execution_status != "pending":
            return False
        return all(dep in completed for dep in self.dependencies)


class ExecutionDependency(BaseModel):
    """A directed edge between two execution nodes."""

    from_node: str  # node ID of the dependency (must complete first)
    to_node: str    # node ID of the dependent (waits for from_node)
    dependency_type: str = "completion"  # "completion" | "data" | "capability"
    optional: bool = False


class ExecutionGraph(BaseModel):
    """The runtime DAG of all work to execute for a dynamic organization."""

    nodes: dict[str, ExecutionNode] = Field(default_factory=dict)
    dependencies: list[ExecutionDependency] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    def add_node(self, node: ExecutionNode) -> None:
        self.nodes[node.id] = node

    def add_dependency(self, dep: ExecutionDependency) -> None:
        self.dependencies.append(dep)
        if dep.to_node in self.nodes and dep.from_node not in self.nodes[dep.to_node].dependencies:
            self.nodes[dep.to_node].dependencies.append(dep.from_node)

    def get_node(self, node_id: str) -> ExecutionNode | None:
        return self.nodes.get(node_id)

    def get_roots(self) -> list[ExecutionNode]:
        """Nodes with no dependencies (can start immediately)."""
        return [
            n for n in self.nodes.values()
            if not n.dependencies
        ]


class ExecutionPlan(BaseModel):
    """An executable plan produced by the ExecutionPlanner.

    Contains the execution graph plus derived scheduling data
    (topological order, parallel groups) that the orchestrator
    uses for execution.
    """

    graph: ExecutionGraph = Field(default_factory=ExecutionGraph)
    topological_order: list[str] = Field(default_factory=list)
    parallel_groups: list[list[str]] = Field(default_factory=list)
    is_valid: bool = False
    node_count: int = 0
    estimated_steps: int = 0
    validation_errors: list[str] = Field(default_factory=list)


class ExecutionPlanner:
    """Converts a dynamic organization into an executable plan.

    The planner does NOT execute anything. It produces an ExecutionPlan
    that the orchestrator (Phase 6) consumes for execution.

    Future capabilities (extension points only — not implemented):
      - Capability-based routing: match specialist requests to available templates
      - Cost-aware scheduling: order nodes by estimated cost
      - Priority scheduling: reorder based on priority field
      - Resource constraints: limit parallel node count
      - Meta-Agent optimisation: replan based on runtime observation
    """

    def plan(
        self,
        organization: DynamicOrganizationStructure,
        manager: RuntimeOrganizationManager | None = None,
    ) -> ExecutionPlan:
        """Create an execution plan from an organization blueprint.

        Args:
            organization: The org structure from OrganizationGenerator.
            manager: Optional runtime state (specialists registered by AgentFactory).
                     When provided, the planner uses registered specialists
                     in addition to blueprint-defined ones.

        Returns:
            ExecutionPlan with graph, topological order, and parallel groups.
        """
        nodes = self.build_tasks(organization, manager)
        deps = self.build_dependencies(nodes)
        graph = ExecutionGraph(metadata={
            "company_name": organization.company_name,
            "industry": organization.industry,
        })
        for node in nodes:
            graph.add_node(node)
        for dep in deps:
            graph.add_dependency(dep)

        errors = self.validate_graph(graph)
        is_valid = len(errors) == 0
        topo_order = self.topological_sort(graph) if is_valid else []
        parallel_groups = self.find_parallel_groups(graph, topo_order) if is_valid else []

        return ExecutionPlan(
            graph=graph,
            topological_order=topo_order,
            parallel_groups=parallel_groups,
            is_valid=is_valid,
            node_count=len(nodes),
            estimated_steps=len(parallel_groups),
            validation_errors=errors,
        )

    def build_tasks(
        self,
        organization: DynamicOrganizationStructure,
        manager: RuntimeOrganizationManager | None = None,
    ) -> list[ExecutionNode]:
        """Build execution nodes from the organization blueprint.

        Creates one node per executive, one per specialist (from blueprint
        or from manager), and one synthesis node.
        """
        nodes: list[ExecutionNode] = []
        node_id_counter = 0

        def _next_id(prefix: str) -> str:
            nonlocal node_id_counter
            node_id_counter += 1
            return f"{prefix}_{node_id_counter}"

        # ── Executive nodes ─────────────────────────────────────────────
        for ex in organization.executives:
            node = ExecutionNode(
                id=_next_id("exec"),
                title=ex.title,
                owner=ex.title,
                node_type="executive",
                priority=5,
                estimated_complexity="medium",
                metadata={
                    "purpose": ex.purpose,
                    "responsibilities": list(ex.responsibilities),
                },
            )
            nodes.append(node)

        # ── Specialist nodes ────────────────────────────────────────────
        # From blueprint (pre-defined required_specialists)
        for ex in organization.executives:
            exec_node_id = next(
                (n.id for n in nodes if n.title == ex.title), None
            )
            for spec_title in ex.required_specialists:
                node = ExecutionNode(
                    id=_next_id("spec"),
                    title=spec_title,
                    owner=ex.title,
                    node_type="specialist",
                    assigned_specialist=spec_title,
                    dependencies=[exec_node_id] if exec_node_id else [],
                    priority=4,
                    estimated_complexity="medium",
                )
                nodes.append(node)

            # From blueprint children (SpecialistRole objects)
            for child in ex.children:
                exec_node_id = next(
                    (n.id for n in nodes if n.title == ex.title), None
                )
                node = ExecutionNode(
                    id=_next_id("spec"),
                    title=child.title,
                    owner=ex.title,
                    node_type="specialist",
                    assigned_specialist=child.title,
                    dependencies=[exec_node_id] if exec_node_id else [],
                    priority=4,
                    estimated_complexity="medium",
                    metadata={
                        "purpose": child.purpose,
                        "responsibilities": list(child.responsibilities),
                    },
                )
                nodes.append(node)

        # From runtime manager (specialists registered during execution)
        if manager is not None:
            for specialist in manager.list_specialists():
                exec_node_id = next(
                    (n.id for n in nodes if n.title == specialist.executive_title),
                    None,
                )
                # Avoid duplicate nodes for specialists already added from blueprint
                already_exists = any(
                    n.title == specialist.title and n.node_type == "specialist"
                    for n in nodes
                )
                if not already_exists:
                    node = ExecutionNode(
                        id=_next_id("spec"),
                        title=specialist.title,
                        owner=specialist.executive_title,
                        node_type="specialist",
                        assigned_specialist=specialist.title,
                        dependencies=[exec_node_id] if exec_node_id else [],
                        priority=4,
                        estimated_complexity="medium",
                        metadata={
                            "purpose": specialist.purpose,
                        },
                    )
                    nodes.append(node)

        # ── Synthesis node ───────────────────────────────────────────────
        exec_node_ids = [
            n.id for n in nodes if n.node_type == "executive"
        ]
        synthesis_node = ExecutionNode(
            id=_next_id("synth"),
            title="CEO Synthesis",
            owner="ceo",
            node_type="synthesis",
            dependencies=exec_node_ids,
            priority=10,
            estimated_complexity="medium",
            metadata={"description": "CEO final deliberation and report"},
        )
        nodes.append(synthesis_node)

        return nodes

    def build_dependencies(
        self,
        nodes: list[ExecutionNode],
    ) -> list[ExecutionDependency]:
        """Build dependency edges from node dependency lists.

        Also detects implicit dependencies:
          - Synthesis depends on all executives
          - Specialists depend on their parent executive
        """
        deps: list[ExecutionDependency] = []

        for node in nodes:
            for dep_id in node.dependencies:
                deps.append(ExecutionDependency(
                    from_node=dep_id,
                    to_node=node.id,
                    dependency_type="completion",
                ))

        return deps

    def validate_graph(self, graph: ExecutionGraph) -> list[str]:
        """Validate the execution graph for correctness.

        Checks:
          - No duplicate node IDs
          - All dependency references point to existing nodes
          - No cycles (DAG requirement)
          - At least one root node
        """
        errors: list[str] = []

        # Check all dependency references
        for dep in graph.dependencies:
            if dep.from_node not in graph.nodes:
                errors.append(
                    f"Dependency from_node '{dep.from_node}' not found in nodes"
                )
            if dep.to_node not in graph.nodes:
                errors.append(
                    f"Dependency to_node '{dep.to_node}' not found in nodes"
                )

        # Check for cycles via DFS
        if not errors:
            try:
                self.topological_sort(graph)
            except ValueError as e:
                errors.append(str(e))

        # Check for at least one root
        roots = graph.get_roots()
        if not roots and graph.nodes:
            errors.append("No root nodes found (all nodes have dependencies)")

        return errors

    def topological_sort(self, graph: ExecutionGraph) -> list[str]:
        """Kahn's algorithm for topological ordering.

        Returns node IDs in execution order (dependencies first).
        Raises ValueError if a cycle is detected.
        """
        in_degree: dict[str, int] = dict.fromkeys(graph.nodes, 0)

        # Build adjacency list and count in-degrees
        adj: dict[str, list[str]] = {
            n_id: [] for n_id in graph.nodes
        }
        for dep in graph.dependencies:
            if dep.from_node in adj and dep.to_node in in_degree:
                adj[dep.from_node].append(dep.to_node)
                in_degree[dep.to_node] += 1

        # Start with nodes that have no dependencies
        queue = deque([
            n_id for n_id, deg in in_degree.items() if deg == 0
        ])

        sorted_nodes: list[str] = []
        while queue:
            node_id = queue.popleft()
            sorted_nodes.append(node_id)
            for neighbor in adj.get(node_id, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(sorted_nodes) != len(graph.nodes):
            cycle_nodes = set(graph.nodes.keys()) - set(sorted_nodes)
            raise ValueError(
                f"Cycle detected involving nodes: {cycle_nodes}"
            )

        return sorted_nodes

    def find_parallel_groups(
        self,
        graph: ExecutionGraph,
        topo_order: list[str],
    ) -> list[list[str]]:
        """Group nodes into parallel execution batches.

        Within each batch, all nodes can execute concurrently because
        their dependencies are satisfied by earlier batches.
        """
        # Track the depth (batch index) of each node
        depth: dict[str, int] = {}
        max_depth = 0

        for node_id in topo_order:
            node = graph.nodes[node_id]
            if not node.dependencies:
                depth[node_id] = 0
            else:
                parent_depths = [
                    depth.get(dep, 0) for dep in node.dependencies
                    if dep in depth
                ]
                depth[node_id] = max(parent_depths) + 1 if parent_depths else 0
            max_depth = max(max_depth, depth[node_id])

        # Group by depth
        groups: list[list[str]] = [[] for _ in range(max_depth + 1)]
        for node_id, d in depth.items():
            groups[d].append(node_id)

        return groups
