from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PATTERN_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"
    PORT: int = 8000
    DEBUG: bool = True

    # PostgreSQL in production (docker-compose); SQLite file for local dev without Docker.
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'astra_pattern.db').as_posix()}"

    # AI provider: MOCK (fixtures, no API calls) or GEMINI (paid tier, approved by owner).
    AI_PROVIDER_MODE: str = "MOCK"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Uploads (Hard rule: validate file type and size)
    MAX_UPLOAD_MB: int = 10
    MAX_IMAGE_SIDE_PX: int = 1600
    ENABLE_OPENCV_CLEANUP: bool = False  # optional contrast clean-up
    ENABLE_REMBG: bool = False           # optional background removal (needs requirements-optional.txt)

    # Demo mode loads data/rules/demo_rules_TEST_DATA.json. Every value from it is
    # labelled TEST DATA in API responses, UI and PDF. Never enable in production.
    ASTRA_DEMO_MODE: bool = False

    # Paths
    DATA_DIR: str = str(BACKEND_DIR / "data" if (BACKEND_DIR / "data").exists() else PATTERN_DIR / "data")
    STORAGE_DIR: str = str(BACKEND_DIR / "storage")


settings = Settings()
