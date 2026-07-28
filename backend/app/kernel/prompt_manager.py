from __future__ import annotations

import json
import os
from typing import Any


PROMPT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "prompts")


class PromptManager:
    """Loads and renders versioned prompt templates from the prompts/ directory.

    Templates are plain markdown files with {{ variable }} placeholders
    replaced at render time. Versioning is managed via the filename:
    planner_v1.md, planner_v2.md, etc.
    """

    def __init__(self, prompt_dir: str | None = None) -> None:
        self._prompt_dir = prompt_dir or PROMPT_DIR
        self._cache: dict[str, str] = {}

    def get_prompt_path(self, template_name: str) -> str | None:
        path = os.path.join(self._prompt_dir, template_name)
        if os.path.isfile(path):
            return path
        for f in os.listdir(self._prompt_dir):
            if f.startswith(template_name.replace(".md", "")) and f.endswith(".md"):
                return os.path.join(self._prompt_dir, f)
        return None

    def load_template(self, template_name: str) -> str:
        if template_name in self._cache:
            return self._cache[template_name]

        path = self.get_prompt_path(template_name)
        if path is None:
            msg = f"Prompt template not found: {template_name}"
            raise FileNotFoundError(msg)

        with open(path) as f:
            content = f.read()
        self._cache[template_name] = content
        return content

    def render(
        self,
        template_name: str,
        context: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> str:
        template = self.load_template(template_name)
        variables = {**(context or {}), **kwargs}
        result = template
        for key, value in variables.items():
            placeholder = "{{ " + key + " }}"
            if isinstance(value, str):
                replacement = value
            elif isinstance(value, (dict, list)):
                replacement = json.dumps(value, indent=2)
            else:
                replacement = str(value)
            result = result.replace(placeholder, replacement)
        return result

    def get_available_versions(self, template_base: str) -> list[str]:
        versions = []
        for f in os.listdir(self._prompt_dir):
            if f.startswith(template_base) and f.endswith(".md"):
                parts = f.replace(".md", "").split("_v")
                if len(parts) > 1:
                    versions.append((int(parts[-1]), f))
        return [f for _, f in sorted(versions, key=lambda x: x[0])]

    def clear_cache(self) -> None:
        self._cache.clear()

    def list_templates(self) -> list[str]:
        return sorted(f for f in os.listdir(self._prompt_dir) if f.endswith(".md"))
