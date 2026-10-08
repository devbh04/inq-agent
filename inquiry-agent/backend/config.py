"""
FastAPI Backend Configuration via Pydantic Settings.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server settings
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

    # LiveKit credentials
    LIVEKIT_URL: str = "wss://your-project.livekit.cloud"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret"

    # Vobiz SIP Trunk
    OUTBOUND_TRUNK_ID: Optional[str] = None
    VOBIZ_SIP_DOMAIN: str = "sip.vobiz.ai"
    VOBIZ_OUTBOUND_NUMBER: Optional[str] = None

    # Supabase credentials
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None


settings = Settings()
