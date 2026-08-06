from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class User:
    def __init__(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        preferred_language: str = "English",
        avatar: str | None = None,
        conversation_count: int = 0,
        last_active: datetime | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        id: str | None = None,
    ) -> None:
        self.id = id or f"user_{datetime.now(timezone.utc).timestamp()}"
        self.name = name
        self.email = email
        self.password_hash = password_hash
        self.preferred_language = preferred_language
        self.avatar = avatar
        self.conversation_count = conversation_count
        self.last_active = last_active or datetime.now(timezone.utc)
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or self.created_at

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "preferredLanguage": self.preferred_language,
            "avatar": self.avatar,
            "conversationCount": self.conversation_count,
            "lastActive": self.last_active.isoformat(),
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
