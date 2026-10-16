"""Application configuration using Pydantic Settings."""
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Core application settings loaded from environment or .env file."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application Metadata
    PROJECT_NAME: str = "Food Verse AI API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development | staging | production
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    # CORS Configuration
    # Safe default: only Vite local frontend ports in dev
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Database
    DATABASE_URL: str = "sqlite:///./food_verse.db"

    # AI Provider Settings
    AI_PROVIDER: str = "mock"  # "mock" or "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Security & Guardrails
    MAX_UPLOAD_SIZE_MB: int = 10

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse string or JSON representation of CORS origins into a list."""
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            # Comma-separated fallback
            return [i.strip() for i in v_trimmed.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def is_production(self) -> bool:
        """Helper to determine if running in production."""
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()
