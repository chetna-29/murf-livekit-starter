from __future__ import annotations

from fastapi import HTTPException, status
from pydantic import BaseModel, EmailStr, Field

try:
    from services.user_service import UserService
    from utils.jwt import create_access_token
except ImportError:  # pragma: no cover - package import fallback
    from ..services.user_service import UserService
    from ..utils.jwt import create_access_token


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    preferredLanguage: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthResponse(BaseModel):
    token: str
    user: dict


class AuthController:
    @staticmethod
    def signup(payload: SignupRequest) -> AuthResponse:
        try:
            user = UserService.create_user(
                name=payload.name,
                email=str(payload.email),
                password=payload.password,
                preferred_language=payload.preferredLanguage or "English",
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        token = create_access_token(user.id)
        return AuthResponse(token=token, user=user.to_dict())

    @staticmethod
    def login(payload: LoginRequest) -> AuthResponse:
        try:
            user = UserService.authenticate(email=str(payload.email), password=payload.password)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        token = create_access_token(user.id)
        return AuthResponse(token=token, user=user.to_dict())
