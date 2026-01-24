import os

class Settings:
    def __init__(self):
        # App settings
        self.APP_NAME: str = "WhatsApp Dashboard"
        self.SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
        self.ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

        # Database - supports both SQLite and PostgreSQL
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./whatsapp_dashboard.db")

        # Frontend URL for CORS
        self.FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://akashvanni.com")

        # Razorpay
        self.RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
        self.RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

        # WhatsApp API (for future integration)
        self.WHATSAPP_API_URL: str = os.getenv("WHATSAPP_API_URL", "")
        self.WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")

        # Pricing (in paise - 100 paise = ₹1)
        self.TEMPLATE_MESSAGE_PRICE: int = 200  # ₹2
        self.SESSION_MESSAGE_PRICE: int = 100   # ₹1

        # Admin credentials (for first setup)
        self.ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@akashvanni.com")
        self.ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "changeme123")

        # Email settings (for alerts)
        self.SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.hostinger.com")
        self.SMTP_PORT: int = int(os.getenv("SMTP_PORT", "465"))
        self.SMTP_USER: str = os.getenv("SMTP_USER", "admin@invoaice.com")
        self.SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
        self.SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Invoaice")

        # Low balance threshold (in paise - ₹200 = 20000 paise)
        self.LOW_BALANCE_THRESHOLD: int = int(os.getenv("LOW_BALANCE_THRESHOLD", "20000"))

settings = Settings()
