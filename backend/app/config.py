from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "WhatsApp Dashboard"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database - supports both SQLite and PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./whatsapp_dashboard.db")

    # Frontend URL for CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://akashvanni.com")

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # WhatsApp API (for future integration)
    WHATSAPP_API_URL: str = ""
    WHATSAPP_API_TOKEN: str = ""

    # Pricing (in paise - 100 paise = ₹1)
    TEMPLATE_MESSAGE_PRICE: int = 200  # ₹2
    SESSION_MESSAGE_PRICE: int = 100   # ₹1

    # Admin credentials (for first setup)
    ADMIN_EMAIL: str = "admin@akashvanni.com"
    ADMIN_PASSWORD: str = "changeme123"

    class Config:
        env_file = ".env"

settings = Settings()
