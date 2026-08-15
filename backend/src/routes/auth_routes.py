from fastapi import APIRouter

try:
    from controllers.auth_controller import AuthController, LoginRequest, SignupRequest
except ImportError:  # pragma: no cover - package import fallback
    from ..controllers.auth_controller import (
        AuthController,
        LoginRequest,
        SignupRequest,
    )

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=dict)
def signup(payload: SignupRequest) -> dict:
    return AuthController.signup(payload).model_dump()


@router.post("/login", response_model=dict)
def login(payload: LoginRequest) -> dict:
    return AuthController.login(payload).model_dump()
