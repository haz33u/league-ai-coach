"""
Configuration management using Pydantic Settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    app_name: str = "League AI Coach"
    environment: str = "development"
    debug: bool = True
    secret_key: str  # обязательное
    
    # Database
    database_url: str  # обязательное
    database_pool_size: int = 10
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Riot API
    riot_api_key: str  # обязательное
    riot_api_base_url: str = "https://europe.api.riotgames.com"
    
    # LLM APIs (optional for now)
    anthropic_api_key: Optional[str] = None
    perplexity_api_key: Optional[str] = None
    
    # Rate Limiting
    rate_limit_per_minute: int = 10
    rate_limit_per_day: int = 100
    
    # JWT
    jwt_secret_key: str  # обязательное
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    model_config = SettingsConfigDict(
        env_file=".env",  # Ищет .env в текущей директории (backend/)
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Global settings instance
settings = Settings()
