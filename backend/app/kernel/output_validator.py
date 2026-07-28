from __future__ import annotations

import json
import re
from typing import Any

from pydantic import BaseModel, ValidationError


class OutputValidator:
    """Validates and repairs AI-generated output before it reaches
    business logic and repositories.

    Pipeline: LLM raw output → JSON Repair → Pydantic Validation →
    Business Rules → Clean dict
    """

    @staticmethod
    def repair_json(raw: str) -> str:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
        cleaned = re.sub(r"(['\"])\s*\+\s*(['\"])", "", cleaned)
        cleaned = re.sub(r"//[^\n]*", "", cleaned)
        cleaned = re.sub(r"/\*.*?\*/", "", cleaned, flags=re.DOTALL)

        # Try to extract JSON object or array from any surrounding text
        json_match = re.search(r"(\{.*\}|\[.*\])\s*$", cleaned, re.DOTALL)
        if json_match:
            cleaned = json_match.group(1)

        return cleaned

    @staticmethod
    def parse_json(raw: str) -> dict[str, Any]:
        repaired = OutputValidator.repair_json(raw)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            raise ValueError(f"Failed to parse AI output as JSON after repair: {repaired[:200]}")

    @staticmethod
    def validate_schema(data: dict[str, Any], schema: type[BaseModel]) -> dict[str, Any]:
        try:
            validated = schema(**data)
            return validated.model_dump(exclude_none=True)
        except ValidationError as e:
            errors = e.errors()
            for err in errors:
                loc = ".".join(str(x) for x in err["loc"])
                if loc in data:
                    # Try coarsening: if the field has any value, keep it
                    pass
            # Best-effort: return original data with validation notes
            return {**data, "_validation_errors": errors}

    @staticmethod
    def check_business_rules(
        data: dict[str, Any],
        rules: list[tuple[str, Any, str]] | None = None,
    ) -> tuple[dict[str, Any], list[str]]:
        violations: list[str] = []
        if rules is None:
            return data, violations

        for field_path, expected_type, rule_desc in rules:
            value = data
            for part in field_path.split("."):
                if isinstance(value, dict):
                    value = value.get(part)
                else:
                    value = None
                    break
            if value is not None and not isinstance(value, expected_type):
                violations.append(rule_desc)

        return data, violations

    @staticmethod
    def ensure_required_fields(
        data: dict[str, Any],
        required: list[str],
        defaults: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        result = dict(data)
        for field in required:
            if field not in result or result[field] is None:
                if defaults and field in defaults:
                    result[field] = defaults[field]
                else:
                    result[field] = None
        return result

    def validate_and_repair(
        self,
        raw: str,
        schema: type[BaseModel] | None = None,
        required_fields: list[str] | None = None,
        field_defaults: dict[str, Any] | None = None,
        business_rules: list[tuple[str, Any, str]] | None = None,
    ) -> dict[str, Any]:
        parsed = self.parse_json(raw)
        validated = self.validate_schema(parsed, schema) if schema else parsed
        validated = self.ensure_required_fields(
            validated, required_fields or [], field_defaults
        )
        validated, violations = self.check_business_rules(validated, business_rules)
        if violations:
            validated["_business_rule_violations"] = violations
        return validated
