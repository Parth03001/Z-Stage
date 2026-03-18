"""
Configuration management using Pydantic Settings with .env file support
"""

from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

CONFIG_DIR = Path(__file__).parent
ENV_FILE = CONFIG_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file"""

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "zstage"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"

    # Server
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    SERVER_RELOAD: bool = True
    SERVER_LOG_LEVEL: str = "info"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def postgres_url(self) -> str:
        """PostgreSQL connection URL with UTF-8 encoding"""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            f"?client_encoding=utf8"
        )

    @property
    def cors_origins_list(self) -> list:
        """CORS origins as a list"""
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — reads .env once"""
    return Settings()
