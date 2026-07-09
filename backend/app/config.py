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

    def get_cors_origins(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return [self.CORS_ORIGINS]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
