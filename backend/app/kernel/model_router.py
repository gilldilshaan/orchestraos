from __future__ import annotations

from typing import Any, ClassVar, cast

_DEFAULT_MODEL = "claude-sonnet-4-5"
_DEFAULT_PROVIDER = "anthropic"


def _route(temp: float, priority: int = 1) -> dict[str, Any]:
    return {
        "provider": _DEFAULT_PROVIDER,
        "model": _DEFAULT_MODEL,
        "temperature": temp,
        "priority": priority,
    }


class ModelRouter:
    """Routes prompts to the optimal LLM model based on task type,
    complexity, cost constraints, and availability.

    Maintains a priority-ordered provider list and can fall through
    if a provider is unavailable or rate-limited.
    """

    PROVIDER_PRIORITY: ClassVar[list[str]] = ["anthropic", "groq", "openai", "google", "litellm", "fallback"]

    TASK_ROUTES: ClassVar[dict[str, dict[str, Any]]] = {
        "compile": _route(0.3),
        "plan": _route(0.4),
        "organization": _route(0.4),
        "risk": _route(0.3),
        "decision": _route(0.4),
        "devils_advocate": _route(0.7),
        "readiness": _route(0.3),
        "missing_info": _route(0.2),
        "success_probability": _route(0.3),
        "resource_gap": _route(0.3),
        "dependency_graph": _route(0.3),
        "bottleneck": _route(0.3),
        "scenario": _route(0.5),
        "dashboard": _route(0.3, priority=2),
        "replan": _route(0.4),
        "simulation": _route(0.5),
    }

    def __init__(self) -> None:
        self._provider_availability: dict[str, bool] = dict.fromkeys(self.PROVIDER_PRIORITY, True)

    def get_route(self, task_type: str, **overrides: Any) -> dict[str, Any]:
        route = dict(self.TASK_ROUTES.get(task_type, self.TASK_ROUTES["compile"]))
        provider = self.get_preferred_provider(task_type)
        route["provider"] = provider
        route.update(overrides)
        return route

    def get_preferred_provider(self, task_type: str) -> str:
        route = dict(self.TASK_ROUTES.get(task_type, self.TASK_ROUTES["compile"]))
        preferred = cast(str, route.get("provider", _DEFAULT_PROVIDER))
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
        return str(self.get_route(task_type).get("model", _DEFAULT_MODEL))
