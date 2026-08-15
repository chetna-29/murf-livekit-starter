from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

try:
    from models.user import User
    from utils.password import hash_password, verify_password
except ImportError:  # pragma: no cover - package import fallback
    from ..models.user import User
    from ..utils.password import hash_password, verify_password


class UserService:
    _users: dict[str, User] = {}
    _emails: dict[str, str] = {}

    @classmethod
    def create_user(
        cls,
        *,
        name: str,
        email: str,
        password: str,
        preferred_language: str = "English",
    ) -> User:
        if email.lower() in cls._emails:
            raise ValueError("Email already registered")

        user = User(
            name=name,
            email=email.lower(),
            password_hash=hash_password(password),
            preferred_language=preferred_language,
        )
        cls._users[user.id] = user
        cls._emails[user.email] = user.id
        return user

    @classmethod
    def get_user_by_email(cls, email: str) -> User | None:
        user_id = cls._emails.get(email.lower())
        if not user_id:
            return None
        return cls._users.get(user_id)

    @classmethod
    def get_user_by_id(cls, user_id: str) -> User | None:
        return cls._users.get(user_id)

    @classmethod
    def authenticate(cls, *, email: str, password: str) -> User:
        user = cls.get_user_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        user.last_active = datetime.now(timezone.utc)
        user.updated_at = datetime.now(timezone.utc)
        return user

    @classmethod
    def update_profile(
        cls,
        user_id: str,
        *,
        name: str | None = None,
        preferred_language: str | None = None,
        avatar: str | None = None,
    ) -> User:
        user = cls.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if name is not None:
            user.name = name
        if preferred_language is not None:
            user.preferred_language = preferred_language
        if avatar is not None:
            user.avatar = avatar

        user.updated_at = datetime.now(timezone.utc)
        user.last_active = datetime.now(timezone.utc)
        return user

    @classmethod
    def increment_conversation_count(cls, user_id: str) -> User:
        user = cls.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        user.conversation_count += 1
        user.last_active = datetime.now(timezone.utc)
        user.updated_at = datetime.now(timezone.utc)
        return user
