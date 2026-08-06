from fastapi import APIRouter, Request

try:
    from controllers.user_controller import ProfileUpdateRequest, UserController
    from middleware.auth import AuthMiddleware
except ImportError:  # pragma: no cover - package import fallback
    from ..controllers.user_controller import ProfileUpdateRequest, UserController
    from ..middleware.auth import AuthMiddleware

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile", response_model=dict)
def get_profile(request: Request) -> dict:
    request.state.user_id = AuthMiddleware.get_current_user(request)["user_id"]
    return UserController.get_profile(request)


@router.put("/profile", response_model=dict)
def update_profile(request: Request, payload: ProfileUpdateRequest) -> dict:
    request.state.user_id = AuthMiddleware.get_current_user(request)["user_id"]
    return UserController.update_profile(request, payload)
