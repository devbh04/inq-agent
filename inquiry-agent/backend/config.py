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

    # BCP Multi-Environment Settings (local, staging, prod)
    BCP_ENV: str = "local"
    BCP_SALES_REP_ID: int = 2

    # Direct Overrides (if set, takes precedence)
    BCP_API_BASE_URL: Optional[str] = None
    BCP_WEBHOOK_KEY_ID: Optional[str] = None
    BCP_WEBHOOK_SECRET: Optional[str] = None
    BCP_VOICE_AGENT_KEY: Optional[str] = None

    # Local environment
    BCP_URL_LOCAL: str = "http://localhost:3000"
    BCP_WEBHOOK_KEY_ID_LOCAL: str = "DEV"
    BCP_WEBHOOK_SECRET_LOCAL: str = "pGQl/pa9+aqThuSrhDgCDKt+vwL8P8Tqz3M7AwpKytM="
    BCP_VOICE_AGENT_KEY_LOCAL: str = "eximple_voice_agent_internal_secret_key_2026"

    # Staging environment
    BCP_URL_STAGING: str = "https://dsfomx6jqcacw.cloudfront.net"
    BCP_WEBHOOK_KEY_ID_STAGING: str = "STAGING"
    BCP_WEBHOOK_SECRET_STAGING: Optional[str] = None
    BCP_VOICE_AGENT_KEY_STAGING: Optional[str] = None

    # Production environment
    BCP_URL_PROD: str = "https://api.eximple.com"
    BCP_WEBHOOK_KEY_ID_PROD: str = "PROD"
    BCP_WEBHOOK_SECRET_PROD: Optional[str] = None
    BCP_VOICE_AGENT_KEY_PROD: Optional[str] = None

    @property
    def bcp_base_url(self) -> str:
        if self.BCP_API_BASE_URL:
            return self.BCP_API_BASE_URL.rstrip("/")
        env = (self.BCP_ENV or "local").lower()
        if env == "staging":
            return self.BCP_URL_STAGING.rstrip("/")
        if env in ("prod", "production"):
            return self.BCP_URL_PROD.rstrip("/")
        return self.BCP_URL_LOCAL.rstrip("/")

    @property
    def bcp_webhook_key_id(self) -> str:
        if self.BCP_WEBHOOK_KEY_ID:
            return self.BCP_WEBHOOK_KEY_ID
        env = (self.BCP_ENV or "local").lower()
        if env == "staging":
            return self.BCP_WEBHOOK_KEY_ID_STAGING
        if env in ("prod", "production"):
            return self.BCP_WEBHOOK_KEY_ID_PROD
        return self.BCP_WEBHOOK_KEY_ID_LOCAL

    @property
    def bcp_webhook_secret(self) -> Optional[str]:
        if self.BCP_WEBHOOK_SECRET:
            return self.BCP_WEBHOOK_SECRET
        env = (self.BCP_ENV or "local").lower()
        if env == "staging":
            return self.BCP_WEBHOOK_SECRET_STAGING
        if env in ("prod", "production"):
            return self.BCP_WEBHOOK_SECRET_PROD
        return self.BCP_WEBHOOK_SECRET_LOCAL

    @property
    def bcp_voice_agent_key(self) -> Optional[str]:
        if self.BCP_VOICE_AGENT_KEY:
            return self.BCP_VOICE_AGENT_KEY
        env = (self.BCP_ENV or "local").lower()
        if env == "staging":
            return self.BCP_VOICE_AGENT_KEY_STAGING
        if env in ("prod", "production"):
            return self.BCP_VOICE_AGENT_KEY_PROD
        return self.BCP_VOICE_AGENT_KEY_LOCAL


settings = Settings()
