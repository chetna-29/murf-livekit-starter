from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class Conversation:
    def __init__(
        self,
        *,
        user_id: str,
        question: str,
        answer: str,
        language: str = "English",
        session_id: str | None = None,
        timestamp: datetime | None = None,
        id: str | None = None,
    ) -> None:
        self.id = id or f"conv_{datetime.now(timezone.utc).timestamp()}"
        self.user_id = user_id
        self.question = question
        self.answer = answer
        self.language = language
        self.session_id = session_id
        self.timestamp = timestamp or datetime.now(timezone.utc)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "userId": self.user_id,
            "question": self.question,
            "answer": self.answer,
            "language": self.language,
            "sessionId": self.session_id,
            "timestamp": self.timestamp.isoformat(),
        }
