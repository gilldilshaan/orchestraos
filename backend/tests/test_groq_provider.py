from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from app.kernel.model_router import ModelRouter


class TestGroqProviderDetection:
    """Provider detection must prioritize Groq when GROQ_API_KEY is set."""

    def test_detects_groq_when_key_set(self):
        with patch("app.llm.client.settings.groq_api_key", "gsk-test-key"):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "groq"
            assert client.available is True

    def test_detects_openai_when_only_openai_key_set(self):
        with (
            patch("app.llm.client.settings.groq_api_key", ""),
            patch("app.llm.client.settings.openai_api_key", "sk-test-key"),
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "openai"
            assert client.available is True

    def test_fallback_when_no_keys_set(self):
        with (
            patch("app.llm.client.settings.groq_api_key", ""),
            patch("app.llm.client.settings.openai_api_key", ""),
            patch("app.llm.client.settings.anthropic_api_key", ""),
            patch("app.llm.client.settings.google_api_key", ""),
            patch("app.llm.client.settings.litellm_master_key", ""),
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "fallback"
            assert client.available is False

    def test_groq_takes_priority_over_openai(self):
        with (
            patch("app.llm.client.settings.groq_api_key", "gsk-test-key"),
            patch("app.llm.client.settings.openai_api_key", "sk-test-key"),
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            assert client.provider_name == "groq"


class TestGroqGenerate:
    """The generate method must use the OpenAI-compatible client for Groq."""

    async def test_uses_openai_client_with_groq_base_url(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"result": "ok"}'

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        with (
            patch("app.llm.client.settings.groq_api_key", "gsk-test-key"),
            patch("openai.AsyncOpenAI", return_value=mock_client) as mock_openai,
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            await client._call_provider(
                prompt="Test prompt",
                system_prompt=None,
                temperature=0.3,
            )

            mock_openai.assert_called_once_with(
                api_key="gsk-test-key",
                base_url="https://api.groq.com/openai/v1",
            )
            assert client._provider == "groq"

    async def test_generate_uses_groq_model_when_not_specified(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "test output"

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        with (
            patch("app.llm.client.settings.groq_api_key", "gsk-test-key"),
            patch("openai.AsyncOpenAI", return_value=mock_client),
        ):
            from app.llm.client import LLMClient

            client = LLMClient()
            await client._call_provider(
                prompt="Test prompt",
                system_prompt="System instruction",
                temperature=0.3,
            )

            mock_client.chat.completions.create.assert_called_once_with(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "System instruction"},
                    {"role": "user", "content": "Test prompt"},
                ],
                temperature=0.3,
            )


class TestModelRouterGroq:
    """ModelRouter must route to Groq as the primary provider."""

    def setup_method(self):
        self.router = ModelRouter()

    def test_groq_is_first_priority(self):
        assert ModelRouter.PROVIDER_PRIORITY[0] == "groq"

    def test_default_task_routes_to_groq(self):
        route = self.router.get_route("compile")
        assert route["provider"] == "groq"
        assert route["model"] == "llama-3.3-70b-versatile"

    def test_all_tasks_route_to_groq(self):
        for task_type in ModelRouter.TASK_ROUTES:
            route = self.router.get_route(task_type)
            assert route["provider"] == "groq", f"{task_type} does not route to groq"

    def test_falls_through_when_groq_unavailable(self):
        self.router.mark_unavailable("groq")
        provider = self.router.get_preferred_provider("compile")
        assert provider == "openai"

    def test_marks_groq_available_again(self):
        self.router.mark_unavailable("groq")
        self.router.mark_available("groq")
        provider = self.router.get_preferred_provider("compile")
        assert provider == "groq"

    def test_unknown_task_defaults_to_groq(self):
        route = self.router.get_route("nonexistent_task")
        assert route["provider"] == "groq"

    def test_fallthrough_to_fallback_when_all_unavailable(self):
        self.router.mark_unavailable("groq")
        self.router.mark_unavailable("openai")
        self.router.mark_unavailable("anthropic")
        self.router.mark_unavailable("google")
        self.router.mark_unavailable("litellm")
        provider = self.router.get_preferred_provider("compile")
        assert provider == "fallback"


class TestGroqGenerateStructured:
    """generate_structured must work with Groq provider output."""

    async def test_generate_structured_parses_groq_json(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"key": "value", "number": 42}'

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        with (
            patch("app.llm.client.settings.groq_api_key", "gsk-test-key"),
            patch("openai.AsyncOpenAI", return_value=mock_client),
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
