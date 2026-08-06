from __future__ import annotations

from fastapi import HTTPException, Request, status
from pydantic import BaseModel, Field

try:
    from services.conversation_service import ConversationService
    from services.user_service import UserService
except ImportError:  # pragma: no cover - package import fallback
    from ..services.conversation_service import ConversationService
    from ..services.user_service import UserService


class ConversationRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=4000)
    language: str = Field(default="English", max_length=40)
    sessionId: str | None = None


class ConversationController:
    @staticmethod
    def add_conversation(request: Request, payload: ConversationRequest) -> dict:
        user_id = request.state.user_id
        UserService.increment_conversation_count(user_id)
        conversation = ConversationService.add_conversation(
            user_id=user_id,
            question=payload.question,
            answer=payload.answer,
            language=payload.language,
            session_id=payload.sessionId,
        )
        return conversation.to_dict()

    @staticmethod
    def list_conversations(request: Request) -> list[dict]:
        user_id = request.state.user_id
        conversations = ConversationService.list_conversations(user_id)
        return [conversation.to_dict() for conversation in conversations]

    @staticmethod
    def delete_conversations(request: Request) -> dict:
        user_id = request.state.user_id
        deleted_count = ConversationService.delete_conversations(user_id)
        return {"deleted": deleted_count}
