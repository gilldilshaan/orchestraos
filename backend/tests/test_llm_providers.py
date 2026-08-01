from __future__ import annotations

from contextlib import ExitStack
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

from app.kernel.model_router import ModelRouter


def keys_context(**overrides: Any) -> ExitStack:
    """Patch every provider key on settings so real .env values never leak in."""
    stack = ExitStack()
    for key in (
        "groq_api_key",
        "openai_api_key",
        "anthropic_api_key",
        "google_api_key",
        "litellm_master_key",
        "openrouter_api_key",
    ):
        stack.enter_context(patch(f"app.llm.client.settings.{key}", overrides.get(key, "")))
    return stack


class TestProviderDetection:
    """LLMClient must detect the highest-priority provider with a key set."""

    def test_detects_anthropic_when_key_set(self):
        with keys_context(anthropic_api_key="sk-ant-test"):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "anthropic"
            assert client.available is True

    def test_detects_openrouter_when_only_openrouter_key_set(self):
        with keys_context(openrouter_api_key="or-test-key"):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "openrouter"
            assert client.available is True

    def test_detects_groq_when_only_groq_key_set(self):
        with keys_context(groq_api_key="gsk-test"):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "groq"
            assert client.available is True

    def test_detects_openai_when_only_openai_key_set(self):
        with keys_context(openai_api_key="sk-test"):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "openai"
            assert client.available is True

    def test_anthropic_takes_priority_over_groq(self):
        with keys_context(anthropic_api_key="sk-ant-test", groq_api_key="gsk-test"):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "anthropic"

    def test_fallback_when_no_keys_set(self):
        with keys_context():
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "fallback"
            assert client.available is False

    def test_default_model_per_provider(self):
        with keys_context(groq_api_key="gsk-test"):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.default_model == "llama-3.3-70b-versatile"


class TestAnthropicGenerate:
    """The generate method must call the Anthropic Messages API via httpx."""

    async def test_uses_anthropic_messages_endpoint(self):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "content": [{"type": "text", "text": "anthropic reply"}]
        }
        mock_response.raise_for_status = MagicMock()

        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=mock_response)
        mock_http.__aenter__ = AsyncMock(return_value=mock_http)
        mock_http.__aexit__ = AsyncMock(return_value=False)

        with (
            keys_context(anthropic_api_key="sk-ant-test"),
            patch("httpx.AsyncClient", return_value=mock_http) as mock_http_client,
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            text = await client._call_provider(
                prompt="Test prompt",
                system_prompt="System instruction",
                temperature=0.3,
            )

            assert text == "anthropic reply"
            mock_http_client.assert_called_once_with(timeout=300)
            call = mock_http.post.await_args
            assert call.args[0] == "https://api.anthropic.com/v1/messages"
            call_kwargs = call.kwargs
            assert call_kwargs["headers"]["x-api-key"] == "sk-ant-test"
            assert call_kwargs["headers"]["anthropic-version"] == "2023-06-01"
            assert call_kwargs["json"]["model"] == "claude-sonnet-4-5"
            assert call_kwargs["json"]["system"] == "System instruction"
            assert call_kwargs["json"]["temperature"] == 0.3
            assert call_kwargs["json"]["messages"] == [
                {"role": "user", "content": "Test prompt"}
            ]

    async def test_generate_returns_raw_text(self):
        mock_response = MagicMock()
        mock_response.json.return_value = {"content": [{"type": "text", "text": "raw"}]}
        mock_response.raise_for_status = MagicMock()

        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=mock_response)
        mock_http.__aenter__ = AsyncMock(return_value=mock_http)
        mock_http.__aexit__ = AsyncMock(return_value=False)

        with (
            keys_context(anthropic_api_key="sk-ant-test"),
            patch("httpx.AsyncClient", return_value=mock_http),
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            result = await client.generate(
                prompt="Test prompt",
                system_prompt="System instruction",
                temperature=0.3,
            )
            assert result == "raw"


class TestModelRouter:
    """ModelRouter must route to Anthropic as the primary provider."""

    def setup_method(self):
        self.router = ModelRouter()

    def test_anthropic_is_first_priority(self):
        assert ModelRouter.PROVIDER_PRIORITY[0] == "anthropic"

    def test_default_task_routes_to_anthropic(self):
        route = self.router.get_route("compile")
        assert route["provider"] == "anthropic"
        assert route["model"] == "claude-sonnet-4-5"

    def test_all_tasks_route_to_anthropic(self):
        for task_type in ModelRouter.TASK_ROUTES:
            route = self.router.get_route(task_type)
            assert route["provider"] == "anthropic", (
                f"{task_type} does not route to anthropic"
            )

    def test_falls_through_when_anthropic_unavailable(self):
        self.router.mark_unavailable("anthropic")
        provider = self.router.get_preferred_provider("compile")
        assert provider == "groq"

    def test_marks_anthropic_available_again(self):
        self.router.mark_unavailable("anthropic")
        self.router.mark_available("anthropic")
        provider = self.router.get_preferred_provider("compile")
        assert provider == "anthropic"

    def test_unknown_task_defaults_to_anthropic(self):
        route = self.router.get_route("nonexistent_task")
        assert route["provider"] == "anthropic"

    def test_fallthrough_to_fallback_when_all_unavailable(self):
        for provider in ModelRouter.PROVIDER_PRIORITY:
            self.router.mark_unavailable(provider)
        provider = self.router.get_preferred_provider("compile")
        assert provider == "fallback"


class TestGenerateStructured:
    """generate_structured must parse JSON from the provider output."""

    async def test_generate_structured_parses_json(self):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "content": [{"type": "text", "text": '{"key": "value", "number": 42}'}]
        }
        mock_response.raise_for_status = MagicMock()

        mock_http = AsyncMock()
        mock_http.post = AsyncMock(return_value=mock_response)
        mock_http.__aenter__ = AsyncMock(return_value=mock_http)
        mock_http.__aexit__ = AsyncMock(return_value=False)

        with (
            keys_context(anthropic_api_key="sk-ant-test"),
            patch("httpx.AsyncClient", return_value=mock_http),
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            result = await client.generate_structured(
                prompt="Test prompt",
                system_prompt="Output JSON",
                temperature=0.3,
                task_type="compile",
            )
            assert result == {"key": "value", "number": 42}
