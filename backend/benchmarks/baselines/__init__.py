from __future__ import annotations

from abc import ABC, abstractmethod

from app.kernel.ai_kernel import AIKernel
from benchmarks.metrics import BenchmarkMetrics


class Baseline(ABC):
    """Abstract base for all benchmark baselines.

    Each baseline represents a different agent architecture:
      - SingleAgent: one flat prompt, no decomposition
      - FixedTeam: sequential specialized agents with fixed roles
      - OrchestraOS: dynamic organization with executives + specialists
    """

    def __init__(self, kernel: AIKernel) -> None:
        self._kernel = kernel

    @property
    def name(self) -> str:
        return self.__class__.__name__.replace("Baseline", "")

    @abstractmethod
    async def run(self, objective_text: str, dataset_name: str, iteration: int) -> BenchmarkMetrics:
        ...
