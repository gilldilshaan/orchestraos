from __future__ import annotations

from typing import Any


class ModelRouter:
    """Routes prompts to the optimal LLM model based on task type,
    complexity, cost constraints, and availability.

    Maintains a priority-ordered provider list and can fall through
    if a provider is unavailable or rate-limited.
    """

    PROVIDER_PRIORITY = ["openai", "anthropic", "google", "litellm", "fallback"]

    TASK_ROUTES: dict[str, dict[str, Any]] = {
        "compile": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 1},
        "plan": {"provider": "openai", "model": "gpt-4o", "temperature": 0.4, "priority": 1},
        "organization": {"provider": "openai", "model": "gpt-4o", "temperature": 0.4, "priority": 1},
        "risk": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 1},
        "decision": {"provider": "openai", "model": "gpt-4o", "temperature": 0.4, "priority": 1},
        "devils_advocate": {"provider": "openai", "model": "gpt-4o", "temperature": 0.7, "priority": 1},
        "readiness": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 1},
        "missing_info": {"provider": "openai", "model": "gpt-4o", "temperature": 0.2, "priority": 1},
        "success_probability": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 1},
        "resource_gap": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 1},
        "dependency_graph": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 1},
        "bottleneck": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 1},
        "scenario": {"provider": "openai", "model": "gpt-4o", "temperature": 0.5, "priority": 1},
        "dashboard": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "priority": 2},
    }

    def __init__(self) -> None:
        self._provider_availability: dict[str, bool] = {
            p: True for p in self.PROVIDER_PRIORITY
        }

    def get_route(self, task_type: str, **overrides: Any) -> dict[str, Any]:
        route = dict(self.TASK_ROUTES.get(task_type, self.TASK_ROUTES["compile"]))
        route.update(overrides)
        return route

    def get_preferred_provider(self, task_type: str) -> str:
        route = self.get_route(task_type)
        preferred = route.get("provider", "openai")
        if self._provider_availability.get(preferred, True):
            return preferred
        for provider in self.PROVIDER_PRIORITY:
            if self._provider_availability.get(provider, True):
                return provider
        return "fallback"

    def mark_unavailable(self, provider: str) -> None:
        self._provider_availability[provider] = False

    def mark_available(self, provider: str) -> None:
        self._provider_availability[provider] = True

    def get_task_temperature(self, task_type: str) -> float:
        return float(self.get_route(task_type).get("temperature", 0.3))

    def get_task_model(self, task_type: str) -> str:
        return str(self.get_route(task_type).get("model", "gpt-4o"))
