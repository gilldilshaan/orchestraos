from __future__ import annotations

from typing import Any


class OrchestraOSError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        super().__init__(self.message)


class LLMProviderError(OrchestraOSError):
    def __init__(self, message: str = "LLM provider error", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-001", message=message, status_code=502, details=details)


class ModuleTimeoutError(OrchestraOSError):
    def __init__(self, message: str = "Module timeout", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-002", message=message, status_code=504, details=details)


class AgentFailureError(OrchestraOSError):
    def __init__(self, message: str = "Agent failure", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-003", message=message, status_code=500, details=details)


class DatabaseConnectionError(OrchestraOSError):
    def __init__(self, message: str = "Database connection error", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-004", message=message, status_code=503, details=details)


class ValidationError(OrchestraOSError):
    def __init__(self, message: str = "Validation error", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-005", message=message, status_code=422, details=details)


class AuthError(OrchestraOSError):
    def __init__(self, message: str = "Authentication error", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-006", message=message, status_code=401, details=details)


class ForbiddenError(OrchestraOSError):
    def __init__(self, message: str = "Forbidden", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-007", message=message, status_code=403, details=details)


class NotFoundError(OrchestraOSError):
    def __init__(self, message: str = "Resource not found", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-008", message=message, status_code=404, details=details)


class RateLimitError(OrchestraOSError):
    def __init__(self, message: str = "Rate limit exceeded", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-009", message=message, status_code=429, details=details)


class ConflictError(OrchestraOSError):
    def __init__(self, message: str = "Conflict", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-010", message=message, status_code=409, details=details)


class ResourceExhaustedError(OrchestraOSError):
    def __init__(self, message: str = "Resource exhausted", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-011", message=message, status_code=507, details=details)


class BadRequestError(OrchestraOSError):
    def __init__(self, message: str = "Bad request", details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(code="E-012", message=message, status_code=400, details=details)
