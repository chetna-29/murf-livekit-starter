from fastapi import APIRouter, Request

try:
    from controllers.conversation_controller import ConversationController, ConversationRequest
    from middleware.auth import AuthMiddleware
except ImportError:  # pragma: no cover - package import fallback
    from ..controllers.conversation_controller import ConversationController, ConversationRequest
    from ..middleware.auth import AuthMiddleware

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=dict)
def create_conversation(request: Request, payload: ConversationRequest) -> dict:
    request.state.user_id = AuthMiddleware.get_current_user(request)["user_id"]
    return ConversationController.add_conversation(request, payload)


@router.get("", response_model=list)
def list_conversations(request: Request) -> list[dict]:
    request.state.user_id = AuthMiddleware.get_current_user(request)["user_id"]
    return ConversationController.list_conversations(request)


@router.delete("", response_model=dict)
def delete_conversations(request: Request) -> dict:
    request.state.user_id = AuthMiddleware.get_current_user(request)["user_id"]
    return ConversationController.delete_conversations(request)
