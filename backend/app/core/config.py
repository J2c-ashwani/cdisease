from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App Info
    APP_NAME: str = "Chronic Disease Lifestyle Coaching Marketplace"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production-min-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # Database
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "coaching_marketplace"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # API
    API_PREFIX: str = "/api/v1"
    
    # Marketplace Commission
    PLATFORM_COMMISSION_RATE: float = 0.25  # 25%
    PLATFORM_FEE_PER_BOOKING: float = 50.0  # ₹50
    
    class Config:
        env_file = ".env"

settings = Settings()
