from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase, MappedAsDataclass):
    pass
