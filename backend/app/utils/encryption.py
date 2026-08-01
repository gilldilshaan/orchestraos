from __future__ import annotations

import base64
import hashlib
import json
from typing import Any, cast

from cryptography.fernet import Fernet

from app.config import settings


def _derive_key() -> bytes:
    raw = settings.secret_key.encode()
    return base64.urlsafe_b64encode(hashlib.sha256(raw).digest())


_cipher = Fernet(_derive_key())


def encrypt_credentials(data: dict[str, Any]) -> str:
    return _cipher.encrypt(json.dumps(data).encode()).decode()


def decrypt_credentials(token: str) -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(_cipher.decrypt(token.encode())))
