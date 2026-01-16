from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import engine, Base
from .routers import auth, customer, payments, admin, messages
from . import models
from .config import settings

# Startup logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)

    from .database import SessionLocal
    from .auth import get_password_hash

    db = SessionLocal()
    try:
        # Check if admin exists
        admin_user = db.query(models.User).filter(models.User.role == "admin").first()
        if not admin_user:
            admin_user = models.User(
                email=settings.ADMIN_EMAIL,
                name="Admin",
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role="admin",
                balance=0
            )
            db.add(admin_user)
            print(f"Created admin user: {settings.ADMIN_EMAIL}")

        # Create default pricing
        template_pricing = db.query(models.PricingConfig).filter(
            models.PricingConfig.message_type == "template"
        ).first()
        if not template_pricing:
            db.add(models.PricingConfig(message_type="template", price=200))

        session_pricing = db.query(models.PricingConfig).filter(
            models.PricingConfig.message_type == "session"
        ).first()
        if not session_pricing:
            db.add(models.PricingConfig(message_type="session", price=100))

        # Create company config with TwoZero details
        company_config = db.query(models.CompanyConfig).first()
        if not company_config:
            db.add(models.CompanyConfig(
                company_name="TWOZERO",
                legal_name="MAHESH",
                gst_number="07ATPPM6940D1ZG",
                address="First Floor, A-784, G. D. Colony, Mayur Vihar, Phase - 3, East Delhi, Delhi, 110096",
                city="Delhi",
                state="Delhi",
                pincode="110096",
                email="support@twozero.in",
                invoice_prefix="TZ"
            ))
            print("Created company config for TWOZERO")

        db.commit()
    except Exception as e:
        print(f"Startup error: {e}")
    finally:
        db.close()

    yield  # App runs here

app = FastAPI(
    title="WhatsApp Dashboard API",
    description="API for WhatsApp messaging dashboard with Razorpay integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - allow frontend domain
origins = [
    "https://akashvanni.com",
    "https://www.akashvanni.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    settings.FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(customer.router)
app.include_router(payments.router)
app.include_router(messages.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {
        "message": "WhatsApp Dashboard API",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
