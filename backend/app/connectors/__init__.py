from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.models.connectors import ConnectorConfig
from app.utils.encryption import decrypt_credentials


class BaseConnector(ABC):
    provider: str = ""

    def __init__(self, config: ConnectorConfig) -> None:
        self.config = config
        self._session: httpx.AsyncClient | None = None
        self._creds: dict[str, Any] | None = None

    @property
    def creds(self) -> dict[str, Any]:
        if self._creds is None and self.config.credentials_encrypted:
            self._creds = decrypt_credentials(self.config.credentials_encrypted)
        return self._creds or {}

    @abstractmethod
    async def connect(self) -> dict[str, Any]: ...

    @abstractmethod
    async def disconnect(self) -> dict[str, Any]: ...

    @abstractmethod
    async def health(self) -> dict[str, Any]: ...

    @abstractmethod
    async def execute(self, action: str, params: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def validate(self) -> bool: ...

    def get_actions(self) -> list[dict[str, Any]]:
        return []

    async def _ensure_session(self) -> httpx.AsyncClient:
        if self._session is None or self._session.is_closed:
            self._session = httpx.AsyncClient(timeout=30.0)
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.is_closed:
            await self._session.aclose()

    async def __aenter__(self) -> BaseConnector:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()


class ConnectorRegistry:
    _connectors: dict[str, type[BaseConnector]] = {}

    @classmethod
    def register(cls, connector_class: type[BaseConnector]) -> type[BaseConnector]:
        cls._connectors[connector_class.provider] = connector_class
        return connector_class

    @classmethod
    def get(cls, provider: str) -> type[BaseConnector] | None:
        return cls._connectors.get(provider)

    @classmethod
    def list_providers(cls) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for name in sorted(cls._connectors):
            instance = cls._connectors[name].__new__(cls._connectors[name])
            result.append({"provider": name, "actions": instance.get_actions()})
        return result

    @classmethod
    def get_action_definitions(cls) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for name, conn_cls in cls._connectors.items():
            try:
                instance = conn_cls.__new__(conn_cls)
                result.append({"provider": name, "actions": instance.get_actions()})
            except Exception:
                result.append({"provider": name, "actions": []})
        return result
