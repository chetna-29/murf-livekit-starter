import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv(".env.local")


@dataclass(slots=True)
class Settings:
    app_name: str = "Aarogyam API"
    api_prefix: str = "/api"
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "aarogyam-dev-secret")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "120"))
    rate_limit_window_seconds: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    default_language: str = "English"
    supported_languages: tuple[str, ...] = (
        "English",
        "Hindi",
        "Tamil",
        "Telugu",
        "Gujarati",
        "Marathi",
        "Malayalam",
        "Kannada",
        "Punjabi",
        "Bengali",
        "Odia",
        "Assamese",
    )


settings = Settings()
