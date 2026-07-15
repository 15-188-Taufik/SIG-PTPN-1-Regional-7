from pydantic_settings import BaseSettings
from typing import List
import json
import os


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    ADMIN_USERNAME: str = "ptpnr7"
    ADMIN_PASSWORD: str = "lampung2024"
    SYNC_API_KEY: str = "ptpn7-secret-sync-key-2026"

    def get_cors_origins(self) -> List[str]:
        val = self.CORS_ORIGINS.strip()
        if not val:
            return []
        # Handle JSON array format
        if val.startswith("[") and val.endswith("]"):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return [str(x).strip() for x in parsed]
            except Exception:
                pass
        # Handle comma-separated format
        if "," in val:
            return [x.strip() for x in val.split(",") if x.strip()]
        # Fallback to single string
        return [val]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
