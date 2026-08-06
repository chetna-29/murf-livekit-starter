from fastapi import APIRouter, Request

try:
    from controllers.dashboard_controller import DashboardController
    from middleware.auth import AuthMiddleware
except ImportError:  # pragma: no cover - package import fallback
    from ..controllers.dashboard_controller import DashboardController
    from ..middleware.auth import AuthMiddleware

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=dict)
def get_dashboard(request: Request) -> dict:
    request.state.user_id = AuthMiddleware.get_current_user(request)["user_id"]
    return DashboardController.get_dashboard(request)
