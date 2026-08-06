from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

try:
    from models.conversation import Conversation
except ImportError:  # pragma: no cover - package import fallback
    from ..models.conversation import Conversation


class ConversationService:
    _conversations: dict[str, list[Conversation]] = {}

    @classmethod
    def add_conversation(cls, *, user_id: str, question: str, answer: str, language: str, session_id: str | None = None) -> Conversation:
        conversation = Conversation(
            user_id=user_id,
            question=question,
            answer=answer,
            language=language,
            session_id=session_id,
        )
        cls._conversations.setdefault(user_id, []).append(conversation)
        return conversation

    @classmethod
    def list_conversations(cls, user_id: str) -> list[Conversation]:
        return cls._conversations.get(user_id, [])

    @classmethod
    def delete_conversations(cls, user_id: str) -> int:
        deleted = cls._conversations.pop(user_id, [])
        return len(deleted)
