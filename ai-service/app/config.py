"""Configuration loaded from environment."""
from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None
    ai_service_token: str = "changeme"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"

    # Training / caching
    content_min_df: int = 1
    content_max_features: int = 4096
    cf_n_factors: int = 16
    cf_random_state: int = 42

    # Hybrid weighting (sum to 1.0)
    hybrid_content_weight: float = 0.6
    hybrid_collab_weight: float = 0.4


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
