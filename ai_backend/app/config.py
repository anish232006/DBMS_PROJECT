import os
from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field


CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
FRONTEND_DIR = BACKEND_DIR.parent

# Read .env from backend first, or fallback to frontend .env if present
env_files = []
if (BACKEND_DIR / ".env").exists():
    env_files.append(str(BACKEND_DIR / ".env"))
if (FRONTEND_DIR / ".env").exists():
    env_files.append(str(FRONTEND_DIR / ".env"))


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Security
    ADMIN_SECRET_TOKEN: str = "admin-secret-dev-key"

    # Groq Cloud API
    GROQ_API_KEY: str = Field(default="", alias="GROQ_API_KEY")
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # Supabase Credentials
    SUPABASE_URL: str = Field(
        default="",
        validation_alias="SUPABASE_URL"
    )
    SUPABASE_KEY: str = Field(
        default="",
        validation_alias="SUPABASE_KEY"
    )
    # Support VITE_ variables if passed from frontend .env
    VITE_SUPABASE_URL: str = ""
    VITE_SUPABASE_ANON_KEY: str = ""

    # Machine Learning & Academic Risk Thresholds
    AT_RISK_THRESHOLD: float = 50.0  # Student with overall average below 50% is considered at risk
    HIGH_RISK_PROBABILITY: float = 0.65
    MODERATE_RISK_PROBABILITY: float = 0.35
    MODEL_DIR: Path = BACKEND_DIR / "models"

    model_config = {
        "env_file": env_files if env_files else None,
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    def get_supabase_url(self) -> str:
        return self.SUPABASE_URL or self.VITE_SUPABASE_URL or os.getenv("SUPABASE_URL", "")

    def get_supabase_key(self) -> str:
        return (
            self.SUPABASE_KEY
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
            or self.VITE_SUPABASE_ANON_KEY
            or os.getenv("SUPABASE_KEY", "")
        )


settings = Settings()
