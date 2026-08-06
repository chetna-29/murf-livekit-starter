from __future__ import annotations

from fastapi import HTTPException, Request, status

try:
    from services.conversation_service import ConversationService
    from services.user_service import UserService
except ImportError:  # pragma: no cover - package import fallback
    from ..services.conversation_service import ConversationService
    from ..services.user_service import UserService


class DashboardController:
    @staticmethod
    def get_dashboard(request: Request) -> dict:
        user_id = request.state.user_id
        user = UserService.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        conversations = ConversationService.list_conversations(user_id)
        last_conversation = conversations[-1].to_dict() if conversations else None

        return {
            "user": user.to_dict(),
            "totalConversations": len(conversations),
            "lastConversation": last_conversation,
            "preferredLanguage": user.preferred_language,
        }
