from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

try:
    from config.settings import settings
    from routes.auth_routes import router as auth_router
    from routes.conversation_routes import router as conversation_router
    from routes.dashboard_routes import router as dashboard_router
    from routes.user_routes import router as user_router
except ImportError:  # pragma: no cover - package import fallback
    from .config.settings import settings
    from .routes.auth_routes import router as auth_router
    from .routes.conversation_routes import router as conversation_router
    from .routes.dashboard_routes import router as dashboard_router
    from .routes.user_routes import router as user_router

app = FastAPI(title=settings.app_name, version="1.0.0")

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(user_router, prefix=settings.api_prefix)
app.include_router(conversation_router, prefix=settings.api_prefix)
app.include_router(dashboard_router, prefix=settings.api_prefix)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": exc.errors()})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
