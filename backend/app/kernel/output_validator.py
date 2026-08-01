from __future__ import annotations

import json
import logging
import re
from typing import Any, cast

from pydantic import BaseModel, ValidationError


class OutputValidator:
    """Validates and repairs AI-generated output before it reaches
    business logic and repositories.

    Pipeline: LLM raw output → JSON Repair → Pydantic Validation →
    Business Rules → Clean dict
    """

    @staticmethod
    def repair_json(raw: str) -> str:
        if not raw:
            return raw
        cleaned = raw.strip()

        # Strip markdown code fences and any surrounding prose.
        if "```" in cleaned:
            cleaned = re.sub(r"^.*?```(?:json)?\s*", "", cleaned, flags=re.DOTALL)
            cleaned = re.sub(r"```.*$", "", cleaned, flags=re.DOTALL)
        cleaned = cleaned.strip()

        # Trailing commas and concatenated string literals.
        cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
        cleaned = re.sub(r"(['\"])\s*\+\s*(['\"])", "", cleaned)
        cleaned = re.sub(r"//[^\n]*", "", cleaned)
        cleaned = re.sub(r"/\*.*?\*/", "", cleaned, flags=re.DOTALL)

        # Fast path: whole string parses as-is (strict=False tolerates
        # literal control characters/newlines that LLMs emit inside strings).
        try:
            json.loads(cleaned, strict=False)
            return cleaned
        except json.JSONDecodeError:
            pass

        # Extract the first complete JSON object or array from surrounding text.
        # Uses non-greedy matching and balanced brace counting.
        brace_depth = 0
        bracket_depth = 0
        json_start = -1
        for i, ch in enumerate(cleaned):
            if ch == "{":
                if brace_depth == 0 and json_start < 0:
                    json_start = i
                brace_depth += 1
            elif ch == "}":
                brace_depth -= 1
                if brace_depth == 0 and json_start >= 0:
                    candidate = cleaned[json_start : i + 1]
                    try:
                        json.loads(candidate, strict=False)
                        return candidate
                    except json.JSONDecodeError:
                        json_start = -1
            elif ch == "[" and json_start < 0 and brace_depth == 0:
                if bracket_depth == 0:
                    json_start = i
                bracket_depth += 1
            elif ch == "]" and json_start >= 0 and brace_depth == 0:
                bracket_depth -= 1
                if bracket_depth == 0:
                    candidate = cleaned[json_start : i + 1]
                    try:
                        json.loads(candidate, strict=False)
                        return candidate
                    except json.JSONDecodeError:
                        json_start = -1

        # Last resort: attempt truncation repair (LLM hit max_tokens mid-JSON).
        # Re-scan for the first opener because json_start may have been reset
        # to -1 by an earlier balanced-but-invalid candidate during the loop.
        opener = re.search(r"[{\[]", cleaned)
        if opener:
            repaired = OutputValidator._repair_truncated(cleaned[opener.start() :])
            try:
                json.loads(repaired, strict=False)
                return repaired
            except json.JSONDecodeError:
                pass

        return cleaned

    @staticmethod
    def _repair_truncated(raw: str) -> str:
        """Repair JSON truncated mid-stream (LLM hit max_tokens) by dropping
        incomplete trailing fragments and closing unclosed braces/brackets.

        Strategy: scan the payload once, recording every "safe cut point"
        (end of a complete string/number/boolean, after ``{``/``[``/``}``/``]``/
        ``,``) together with the bracket-stack snapshot at that moment. Then
        walk the cut points newest → oldest, close the snapshot's brackets,
        and return the first candidate that parses. This guarantees a valid
        result even when truncation lands mid-string or mid-number.
        """
        start = -1
        for i, ch in enumerate(raw):
            if ch in "{[":
                start = i
                break
        if start < 0:
            return raw

        body = raw[start:]
        cuts: list[tuple[int, list[str]]] = []
        stack: list[str] = []
        in_string = False
        escape = False
        i = 0
        n = len(body)
        while i < n:
            ch = body[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
                    cuts.append((i + 1, list(stack)))
                i += 1
                continue

            if ch == '"':
                in_string = True
                i += 1
            elif ch == "{":
                stack.append("}")
                cuts.append((i + 1, list(stack)))
                i += 1
            elif ch == "[":
                stack.append("]")
                cuts.append((i + 1, list(stack)))
                i += 1
            elif ch == "}":
                if stack and stack[-1] == "}":
                    stack.pop()
                    cuts.append((i + 1, list(stack)))
                else:
                    break
                i += 1
            elif ch == "]":
                if stack and stack[-1] == "]":
                    stack.pop()
                    cuts.append((i + 1, list(stack)))
                else:
                    break
                i += 1
            elif ch == ",":
                cuts.append((i + 1, list(stack)))
                i += 1
            elif ch in "0123456789-.eE+" or ch.isalpha():
                j = i + 1
                while j < n and (
                    body[j] in "0123456789-.eE+"
                    or body[j].isalpha()
                ):
                    j += 1
                token = body[i:j]
                if token in {"true", "false", "null"} or (
                    token[0] in "0123456789-" and any(c.isdigit() for c in token)
                ):
                    cuts.append((j, list(stack)))
                i = j
            else:
                i += 1

        # Complete unambiguous partial boolean/null literals ("tru" -> "true")
        # so the pair is preserved instead of dropped by the walk-back.
        if not in_string:
            for token, completion in (("tru", "e"), ("fals", "e"), ("nul", "l")):
                if body.endswith(token):
                    body = body + completion
                    cuts.append((len(body), list(stack)))
                    break

        # Walk cut points newest → oldest; first parseable candidate wins.
        for pos, snapshot in reversed(cuts):
            prefix = body[:pos].rstrip()
            if prefix.endswith(","):
                prefix = prefix[:-1].rstrip()
            candidate = prefix + "".join(reversed(snapshot))
            try:
                json.loads(candidate, strict=False)
                return candidate
            except json.JSONDecodeError:
                continue

        return body

    @staticmethod
    def parse_json(raw: str) -> dict[str, Any]:
        repaired = OutputValidator.repair_json(raw)
        try:
            return cast(dict[str, Any], json.loads(repaired, strict=False))
        except json.JSONDecodeError as err:
            raise ValueError(f"Failed to parse AI output as JSON after repair: {repaired[:200]}") from err

    @staticmethod
    def validate_schema(data: dict[str, Any], schema: type[BaseModel]) -> dict[str, Any]:
        try:
            validated = schema(**data)
            return validated.model_dump(exclude_none=True)
        except ValidationError as e:
            errors = e.errors()
            filtered = dict(data)
            repaired: list[str] = []
            for err in errors:
                loc = ".".join(str(x) for x in err["loc"])
                if loc in filtered:
                    del filtered[loc]
                    repaired.append(loc)
            if repaired:
                logging.warning("Removed %d invalid fields from %s: %s", len(repaired), schema.__name__, repaired)
            try:
                validated = schema(**filtered)
                return validated.model_dump(exclude_none=True)
            except ValidationError:
                filtered["_validation_errors"] = errors
                return filtered

    @staticmethod
    def check_business_rules(
        data: dict[str, Any],
        rules: list[tuple[str, Any, str]] | None = None,
    ) -> tuple[dict[str, Any], list[str]]:
        violations: list[str] = []
        if rules is None:
            return data, violations

        for field_path, expected_type, rule_desc in rules:
            value: Any = data
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
