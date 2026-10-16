"""Application configuration using Pydantic Settings."""
import json
import os
import tempfile
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
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Media & Upload Security Guardrails
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_MIME_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]
    MAX_IMAGE_DIMENSION_PX: int = 2048
    TEMP_UPLOAD_DIR: str = ""

    # AI Provider Settings
    # Supported values: "vertexai" (Google Cloud Vertex AI), "gemini" (Gemini Developer API), "mock" (Test mode)
    AI_PROVIDER: str = "mock"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    AI_REQUEST_TIMEOUT_SECONDS: int = 25

    # Google Cloud Vertex AI Configuration
    GCP_PROJECT_ID: str = ""
    GCP_LOCATION: str = "us-central1"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    # Database Placeholder (Persistent storage enabled in database phase)
    DATABASE_URL: str = "sqlite:///./food_verse.db"

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

    @field_validator("AI_PROVIDER", mode="before")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        clean = str(v).lower().strip()
        allowed = ("vertexai", "gemini", "mock")
        if clean not in allowed:
            raise ValueError(f"Invalid AI_PROVIDER '{v}'. Must be one of: {', '.join(allowed)}")
        return clean

    @property
    def is_production(self) -> bool:
        """Helper to determine if running in production."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_gemini_configured(self) -> bool:
        """Helper to verify if a valid Gemini Developer API key is present."""
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip() and not self.GEMINI_API_KEY.startswith("your_"))

    @property
    def is_vertexai_configured(self) -> bool:
        """Helper to verify if Google Cloud Vertex AI parameters are configured."""
        return bool(self.GCP_PROJECT_ID and self.GCP_PROJECT_ID.strip() and not self.GCP_PROJECT_ID.startswith("your_"))

    @property
    def safe_temp_dir(self) -> str:
        """Return a validated safe temporary directory path."""
        if self.TEMP_UPLOAD_DIR and os.path.isdir(self.TEMP_UPLOAD_DIR):
            return self.TEMP_UPLOAD_DIR
        return tempfile.gettempdir()


settings = Settings()
