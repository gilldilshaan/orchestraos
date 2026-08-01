from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"
    api_version: str = "1.0.0"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/orchestraos"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM Providers
    openrouter_api_key: str = ""
    groq_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""
    litellm_master_key: str = ""

    # Auth
    jwt_secret: str = ""
    secret_key: str = ""

    def model_post_init(self, /, __context: object) -> None:
        if self.app_env != "development":
            if not self.jwt_secret:
                import warnings
                warnings.warn(
                    "JWT_SECRET is not set! Using insecure default. Set a strong secret for production.",
                    stacklevel=2,
                )
                self.jwt_secret = "dev-jwt-secret"
            if not self.secret_key:
                import warnings
                warnings.warn(
                    "SECRET_KEY is not set! Using insecure default. Set a strong secret for production.",
                    stacklevel=2,
                )
                self.secret_key = "dev-secret-key"


settings = Settings()
