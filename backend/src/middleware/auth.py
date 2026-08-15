from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request, status

try:
    from utils.jwt import decode_access_token
except ImportError:  # pragma: no cover - package import fallback
    from ..utils.jwt import decode_access_token


class AuthMiddleware:
    @staticmethod
    def get_current_user(request: Request) -> dict[str, Any]:
        authorization = request.headers.get("authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid token",
            )

        token = authorization.split(" ", 1)[1]
        try:
            payload = decode_access_token(token)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            ) from exc

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload missing user id",
            )

        return {"user_id": user_id}
