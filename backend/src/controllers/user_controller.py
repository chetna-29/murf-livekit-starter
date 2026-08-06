from __future__ import annotations

from fastapi import HTTPException, Request, status
from pydantic import BaseModel, Field

try:
    from services.user_service import UserService
except ImportError:  # pragma: no cover - package import fallback
    from ..services.user_service import UserService


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    preferredLanguage: str | None = None
    avatar: str | None = None


class UserController:
    @staticmethod
    def get_profile(request: Request) -> dict:
        user_id = request.state.user_id
        user = UserService.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user.to_dict()

    @staticmethod
    def update_profile(request: Request, payload: ProfileUpdateRequest) -> dict:
        user_id = request.state.user_id
        try:
            user = UserService.update_profile(
                user_id,
                name=payload.name,
                preferred_language=payload.preferredLanguage,
                avatar=payload.avatar,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        return user.to_dict()
