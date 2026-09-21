"""
Core Configuration and Settings for MedAgent SaaS
"""

import json
import os
from typing import List
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application Settings using Pydantic"""
    
    # App Info
    APP_NAME: str = "MedAgent SaaS"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # Database
    DATABASE_URL: str
    DATABASE_MAX_POOL_SIZE: int = 20
    DATABASE_MIN_POOL_SIZE: int = 5
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DB: int = 0
    
    # JWT Authentication
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Telegram
    TELEGRAM_BOT_TOKEN: str
    TELEGRAM_API_TIMEOUT: int = 30
    
    # LLM/AI
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4-turbo"
    LLM_MAX_TOKENS: int = 2000
    LLM_TEMPERATURE: float = 0.7
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Features
    ENABLE_AI_BOOKING: bool = True
    ENABLE_AUTOMATED_CONFIRMATION: bool = True
    CONFIRMATION_REMINDER_HOURS: List[int] = [24, 2]  # 24h va 2h before
    
    # Waiting List
    ENABLE_WAITING_LIST: bool = True
    WAITING_LIST_AUTO_ASSIGN: bool = True
    
    # Appointment Hold Duration (seconds)
    APPOINTMENT_HOLD_DURATION: int = 180  # 3 minutes
    
    # No-Show Configuration
    NO_SHOW_AUTO_FOLLOW_UP: bool = True
    NO_SHOW_FOLLOW_UP_MESSAGE: str = "Navbatingizga kelmadingiz. Iltimos qayta yoziling."
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if value is None:
            return ["http://localhost:3000", "http://localhost:3001"]
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return parsed
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return [str(value)]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# Export settings
settings = get_settings()
