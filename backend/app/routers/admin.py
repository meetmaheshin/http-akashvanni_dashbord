from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import csv
import io
import os
import razorpay
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_admin
from ..config import settings
from ..email_utils import check_and_send_low_balance_alert

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")


class WhatsAppConfigUpdate(BaseModel):
    meta_app_id: Optional[str] = None
    meta_app_secret: Optional[str] = None
    meta_redirect_uri: Optional[str] = None
    meta_config_id: Optional[str] = None
    meta_webhook_verify_token: Optional[str] = None

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard", response_model=schemas.AdminDashboardStats)
def get_admin_dashboard(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Total customers (excluding admins)
    total_customers = db.query(models.User).filter(
        models.User.role == "customer"
    ).count()

    # Active customers
    active_customers = db.query(models.User).filter(
        models.User.role == "customer",
        models.User.is_active == True
    ).count()

    # Total revenue (all completed credit transactions)
    total_revenue = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == "credit",
        models.Transaction.status == "completed"
    ).scalar() or 0

    # Total messages
    total_messages = db.query(models.Message).count()

    # Messages today
    today = datetime.utcnow().date()
    messages_today = db.query(models.Message).filter(
        func.date(models.Message.created_at) == today
    ).count()

    return schemas.AdminDashboardStats(
        total_customers=total_customers,
        active_customers=active_customers,
        total_revenue=total_revenue,
        revenue_rupees=total_revenue / 100,
        total_messages=total_messages,
        messages_today=messages_today
    )

@router.get("/customers", response_model=List[schemas.UserResponse])
def get_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query(None),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "customer")

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.User.email.ilike(search_filter)) |
            (models.User.name.ilike(search_filter)) |
            (models.User.phone.ilike(search_filter))
        )

    customers = query.order_by(models.User.created_at.desc()).offset(skip).limit(limit).all()
    return customers

@router.post("/customers")
def create_customer(
    customer: schemas.AdminUserCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new customer manually"""
    from ..auth import get_password_hash
    import secrets

    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == customer.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Clean phone number if provided
    phone = None
    if customer.phone:
        phone = ''.join(filter(str.isdigit, customer.phone))
        if len(phone) == 12 and phone.startswith('91'):
            phone = phone[2:]

    # Generate password if not provided
    password = customer.password or secrets.token_urlsafe(8)

    new_user = models.User(
        email=customer.email,
        name=customer.name,
        phone=phone,
        company_name=customer.company_name,
        hashed_password=get_password_hash(password),
        role="customer",
        portal_enabled=customer.portal_enabled,
        balance=customer.initial_balance or 0,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Customer created successfully",
        "customer": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "phone": new_user.phone,
            "portal_enabled": new_user.portal_enabled,
            "balance": new_user.balance
        },
        "password": password  # Return password so admin can share it
    }

@router.get("/customers/{user_id}", response_model=schemas.UserResponse)
def get_customer(
    user_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "customer"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    return user


@router.post("/impersonate/{user_id}")
def impersonate_customer(
    user_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Generate a token to view the dashboard as a customer.
    This allows admin to see exactly what the customer sees.
    """
    from ..auth import create_access_token
    from datetime import timedelta

    # Verify customer exists
    customer = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "customer"
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Create a special token with impersonation flag
    # Token expires in 1 hour for security
    access_token = create_access_token(
        data={
            "sub": customer.email,
            "impersonated_by": admin.email,
            "is_impersonation": True
        },
        expires_delta=timedelta(hours=1)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "balance": customer.balance,
            "balance_rupees": customer.balance / 100
        },
        "impersonated_by": admin.email,
        "message": f"You are now viewing as {customer.name}"
    }

@router.put("/customers/{user_id}")
def update_customer(
    user_id: int,
    update_data: schemas.AdminUserUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "customer"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    if update_data.is_active is not None:
        user.is_active = update_data.is_active

    if update_data.portal_enabled is not None:
        user.portal_enabled = update_data.portal_enabled

    if update_data.phone is not None:
        # Clean phone number
        phone = ''.join(filter(str.isdigit, update_data.phone))
        if len(phone) == 12 and phone.startswith('91'):
            phone = phone[2:]
        user.phone = phone

    if update_data.balance_adjustment:
        # Create a transaction for the adjustment
        transaction = models.Transaction(
            user_id=user.id,
            amount=abs(update_data.balance_adjustment),
            type="credit" if update_data.balance_adjustment > 0 else "debit",
            status="completed",
            description=update_data.adjustment_reason or f"Admin adjustment by {admin.email}"
        )
        db.add(transaction)

        user.balance += update_data.balance_adjustment

        if user.balance < 0:
            user.balance = 0  # Don't allow negative balance

    db.commit()
    db.refresh(user)

    return {
        "message": "Customer updated",
        "customer": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "phone": user.phone,
            "balance": user.balance,
            "balance_rupees": user.balance / 100,
            "is_active": user.is_active,
            "portal_enabled": user.portal_enabled
        }
    }

@router.get("/customers/{user_id}/transactions", response_model=List[schemas.TransactionResponse])
def get_customer_transactions(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Verify customer exists
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "customer"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id
    ).order_by(models.Transaction.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for t in transactions:
        resp = schemas.TransactionResponse(
            id=t.id,
            user_id=t.user_id,
            amount=t.amount,
            type=t.type,
            status=t.status,
            description=t.description,
            razorpay_order_id=t.razorpay_order_id,
            razorpay_payment_id=t.razorpay_payment_id,
            created_at=t.created_at,
            amount_rupees=t.amount / 100
        )
        result.append(resp)

    return result

@router.get("/customers/{user_id}/messages", response_model=List[schemas.MessageResponse])
def get_customer_messages(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Verify customer exists
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "customer"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    messages = db.query(models.Message).filter(
        models.Message.user_id == user_id
    ).order_by(models.Message.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for m in messages:
        resp = schemas.MessageResponse(
            id=m.id,
            user_id=m.user_id,
            recipient_phone=m.recipient_phone,
            recipient_name=m.recipient_name,
            message_type=m.message_type,
            template_name=m.template_name,
            message_content=m.message_content,
            status=m.status,
            whatsapp_message_id=m.whatsapp_message_id,
            cost=m.cost,
            cost_rupees=m.cost / 100,
            created_at=m.created_at,
            sent_at=m.sent_at,
            delivered_at=m.delivered_at,
            read_at=m.read_at,
            error_message=m.error_message
        )
        result.append(resp)

    return result

# Pricing management
@router.get("/pricing", response_model=schemas.PricingResponse)
def get_pricing(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    template_config = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "template"
    ).first()

    session_config = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "session"
    ).first()

    template_price = template_config.price if template_config else 200
    session_price = session_config.price if session_config else 100

    return schemas.PricingResponse(
        template_price=template_price,
        session_price=session_price,
        template_price_rupees=template_price / 100,
        session_price_rupees=session_price / 100
    )

@router.put("/pricing")
def update_pricing(
    pricing: schemas.PricingUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Update or create template pricing
    template_config = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "template"
    ).first()

    if template_config:
        template_config.price = pricing.template_price
    else:
        template_config = models.PricingConfig(
            message_type="template",
            price=pricing.template_price
        )
        db.add(template_config)

    # Update or create session pricing
    session_config = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "session"
    ).first()

    if session_config:
        session_config.price = pricing.session_price
    else:
        session_config = models.PricingConfig(
            message_type="session",
            price=pricing.session_price
        )
        db.add(session_config)

    db.commit()

    return {
        "message": "Pricing updated",
        "template_price_rupees": pricing.template_price / 100,
        "session_price_rupees": pricing.session_price / 100
    }

# API Configuration management
@router.get("/api-configs", response_model=List[schemas.APIConfigResponse])
def get_api_configs(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    configs = db.query(models.APIConfig).all()
    return configs

@router.post("/api-configs", response_model=schemas.APIConfigResponse)
def create_api_config(
    config: schemas.APIConfigCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(models.APIConfig).filter(
        models.APIConfig.name == config.name
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Config with this name already exists")

    db_config = models.APIConfig(
        name=config.name,
        api_key=config.api_key,
        api_secret=config.api_secret,
        api_url=config.api_url,
        extra_config=config.extra_config
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)

    return db_config

@router.put("/api-configs/{config_id}")
def update_api_config(
    config_id: int,
    config: schemas.APIConfigCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_config = db.query(models.APIConfig).filter(
        models.APIConfig.id == config_id
    ).first()

    if not db_config:
        raise HTTPException(status_code=404, detail="Config not found")

    if config.api_key is not None:
        db_config.api_key = config.api_key
    if config.api_secret is not None:
        db_config.api_secret = config.api_secret
    if config.api_url is not None:
        db_config.api_url = config.api_url
    if config.extra_config is not None:
        db_config.extra_config = config.extra_config

    db.commit()
    db.refresh(db_config)

    return {"message": "Config updated", "id": db_config.id}

@router.delete("/api-configs/{config_id}")
def delete_api_config(
    config_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_config = db.query(models.APIConfig).filter(
        models.APIConfig.id == config_id
    ).first()

    if not db_config:
        raise HTTPException(status_code=404, detail="Config not found")

    db.delete(db_config)
    db.commit()

    return {"message": "Config deleted"}

# CSV Import for messages
@router.post("/import-messages/{user_id}")
def import_messages_csv(
    user_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    deduct_balance: bool = Query(True, description="Deduct balance for imported messages"),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Import messages from CSV. The CSV should have a 'Type' column with values 'template' or 'session'.
    - template messages: ₹2.00 each
    - session messages: ₹1.00 each
    """
    # Verify customer exists
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "customer"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Get pricing from database
    template_pricing = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "template"
    ).first()
    session_pricing = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "session"
    ).first()

    # Default prices: template = ₹2 (200 paise), session = ₹1 (100 paise)
    template_cost = template_pricing.price if template_pricing else 200
    session_cost = session_pricing.price if session_pricing else 100

    # Read and parse CSV
    try:
        contents = file.file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(contents))

        imported_count = 0
        skipped_count = 0
        total_cost = 0
        template_count = 0
        session_count = 0

        for row in csv_reader:
            # Check if message already exists (by whatsapp_message_id)
            message_sid = row.get('MessageSid', '')
            if message_sid:
                existing = db.query(models.Message).filter(
                    models.Message.whatsapp_message_id == message_sid
                ).first()
                if existing:
                    skipped_count += 1
                    continue

            # Get message type from CSV 'Type' column (default to 'template' if not specified)
            csv_msg_type = row.get('Type', '').strip().lower()
            if csv_msg_type in ['session', 'reply']:
                msg_type = 'session'
                message_cost = session_cost
                session_count += 1
            else:
                # Default to template for 'template', empty, or any other value
                msg_type = 'template'
                message_cost = template_cost
                template_count += 1

            # Parse the CSV row
            direction = row.get('Direction', 'outbound-api')
            from_number = row.get('From', '').replace('whatsapp:', '')
            to_number = row.get('To', '').replace('whatsapp:', '')
            body = row.get('Body', '')
            status = row.get('Status', 'sent')
            date_sent = row.get('DateSent', '')

            # Only charge for outbound messages
            is_outbound = direction != 'inbound'

            # Determine recipient phone based on direction
            if direction == 'inbound':
                recipient_phone = from_number
            else:
                recipient_phone = to_number

            # Parse date
            created_at = datetime.utcnow()
            sent_at = None
            if date_sent:
                try:
                    created_at = datetime.strptime(date_sent, '%Y-%m-%d %H:%M:%S')
                    sent_at = created_at
                except:
                    try:
                        created_at = datetime.strptime(date_sent, '%Y-%m-%dT%H:%M:%S')
                        sent_at = created_at
                    except:
                        pass

            # Map status
            status_map = {
                'delivered': 'delivered',
                'sent': 'sent',
                'read': 'read',
                'failed': 'failed',
                'received': 'delivered'
            }
            mapped_status = status_map.get(status.lower(), 'sent')

            # Calculate cost for this message (only outbound, non-failed)
            msg_cost = message_cost if (is_outbound and mapped_status != 'failed' and deduct_balance) else 0
            total_cost += msg_cost

            # Create message record
            message = models.Message(
                user_id=user_id,
                recipient_phone=recipient_phone,
                recipient_name=None,
                message_type=msg_type,
                template_name=f"CSV Import - {msg_type}" if msg_type == "template" else None,
                message_content=body,
                direction=direction if direction in ['inbound', 'outbound'] else 'outbound',
                status=mapped_status,
                whatsapp_message_id=message_sid if message_sid else None,
                cost=msg_cost,
                created_at=created_at,
                sent_at=sent_at,
                delivered_at=created_at if mapped_status == 'delivered' else None,
                read_at=created_at if mapped_status == 'read' else None,
                error_message=None
            )
            db.add(message)
            imported_count += 1

        # Deduct balance from user if enabled and there's a cost
        if deduct_balance and total_cost > 0:
            user.balance -= total_cost

            # Create a single transaction for the batch import
            description_parts = []
            if template_count > 0:
                description_parts.append(f"{template_count} template")
            if session_count > 0:
                description_parts.append(f"{session_count} session")
            transaction = models.Transaction(
                user_id=user_id,
                type="debit",
                amount=total_cost,
                description=f"WhatsApp Messages: {' + '.join(description_parts)}",
                status="completed"
            )
            db.add(transaction)

            # Check for low balance and send alert in background
            background_tasks.add_task(check_and_send_low_balance_alert, user)

        db.commit()

        return {
            "message": "CSV import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "template_count": template_count,
            "session_count": session_count,
            "user_id": user_id,
            "total_cost_paise": total_cost,
            "total_cost_rupees": total_cost / 100,
            "balance_deducted": deduct_balance and total_cost > 0,
            "new_balance_paise": user.balance,
            "new_balance_rupees": user.balance / 100
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

# All transactions (for admin overview)
@router.get("/transactions", response_model=List[schemas.TransactionResponse])
def get_all_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    type: str = Query(None),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)

    if type:
        query = query.filter(models.Transaction.type == type)

    transactions = query.order_by(models.Transaction.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for t in transactions:
        resp = schemas.TransactionResponse(
            id=t.id,
            user_id=t.user_id,
            amount=t.amount,
            type=t.type,
            status=t.status,
            description=t.description,
            razorpay_order_id=t.razorpay_order_id,
            razorpay_payment_id=t.razorpay_payment_id,
            created_at=t.created_at,
            amount_rupees=t.amount / 100
        )
        result.append(resp)

    return result

# All messages (for admin overview)
@router.get("/messages", response_model=List[schemas.MessageResponse])
def get_all_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    messages = db.query(models.Message).order_by(
        models.Message.created_at.desc()
    ).offset(skip).limit(limit).all()

    result = []
    for m in messages:
        resp = schemas.MessageResponse(
            id=m.id,
            user_id=m.user_id,
            recipient_phone=m.recipient_phone,
            recipient_name=m.recipient_name,
            message_type=m.message_type,
            template_name=m.template_name,
            message_content=m.message_content,
            status=m.status,
            whatsapp_message_id=m.whatsapp_message_id,
            cost=m.cost,
            cost_rupees=m.cost / 100,
            created_at=m.created_at,
            sent_at=m.sent_at,
            delivered_at=m.delivered_at,
            read_at=m.read_at,
            error_message=m.error_message
        )
        result.append(resp)

    return result


# ========== WhatsApp Configuration Endpoints ==========

@router.get("/whatsapp-config")
def get_whatsapp_config(
    admin: models.User = Depends(get_current_admin)
):
    """Get WhatsApp/Meta API configuration"""
    return {
        "meta_app_id": os.getenv("META_APP_ID", ""),
        "meta_app_secret": "***" if os.getenv("META_APP_SECRET") else "",  # Don't expose secret
        "meta_redirect_uri": os.getenv("META_REDIRECT_URI", "https://akashvanni.com/whatsapp-connect"),
        "meta_config_id": os.getenv("META_CONFIG_ID", ""),
        "meta_webhook_verify_token": os.getenv("META_WEBHOOK_VERIFY_TOKEN", ""),
    }


@router.put("/whatsapp-config")
def update_whatsapp_config(
    config: WhatsAppConfigUpdate,
    admin: models.User = Depends(get_current_admin)
):
    """Update WhatsApp/Meta API configuration - writes to .env file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")

    # Read existing .env content
    env_content = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_content[key] = value

    # Update with new values (only if provided and not empty)
    if config.meta_app_id:
        env_content["META_APP_ID"] = config.meta_app_id
        os.environ["META_APP_ID"] = config.meta_app_id
    if config.meta_app_secret and config.meta_app_secret != "***":
        env_content["META_APP_SECRET"] = config.meta_app_secret
        os.environ["META_APP_SECRET"] = config.meta_app_secret
    if config.meta_redirect_uri:
        env_content["META_REDIRECT_URI"] = config.meta_redirect_uri
        os.environ["META_REDIRECT_URI"] = config.meta_redirect_uri
    if config.meta_config_id:
        env_content["META_CONFIG_ID"] = config.meta_config_id
        os.environ["META_CONFIG_ID"] = config.meta_config_id
    if config.meta_webhook_verify_token:
        env_content["META_WEBHOOK_VERIFY_TOKEN"] = config.meta_webhook_verify_token
        os.environ["META_WEBHOOK_VERIFY_TOKEN"] = config.meta_webhook_verify_token

    # Write back to .env file
    with open(env_path, 'w') as f:
        for key, value in env_content.items():
            f.write(f"{key}={value}\n")

    return {"message": "WhatsApp configuration updated successfully"}


@router.get("/whatsapp-customers")
def get_whatsapp_customers(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all customers who have connected WhatsApp"""
    customers = db.query(models.User).filter(
        models.User.role == "customer",
        models.User.whatsapp_waba_id.isnot(None)
    ).all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "whatsapp_business_name": c.whatsapp_business_name,
            "whatsapp_phone_number": c.whatsapp_phone_number,
            "whatsapp_quality_rating": c.whatsapp_quality_rating,
            "whatsapp_connected_at": c.whatsapp_connected_at,
        }
        for c in customers
    ]


# ========== Twilio Sync Endpoints ==========

class PhoneMappingCreate(BaseModel):
    phone_number: str  # Twilio sender phone number (e.g., +916355060488)
    user_id: int  # Customer ID to map to
    twilio_account_sid: Optional[str] = None  # Per-customer Twilio SID (for subaccounts)
    twilio_auth_token: Optional[str] = None   # Per-customer Twilio Auth Token

class PhoneMappingResponse(BaseModel):
    id: int
    phone_number: str
    user_id: int
    user_name: str
    user_email: str
    has_twilio_credentials: bool  # True if per-customer credentials configured
    created_at: datetime


@router.get("/phone-mappings")
def get_phone_mappings(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all phone number to customer mappings"""
    mappings = db.query(models.PhoneMapping).all()

    result = []
    for m in mappings:
        user = db.query(models.User).filter(models.User.id == m.user_id).first()
        result.append({
            "id": m.id,
            "phone_number": m.phone_number,
            "user_id": m.user_id,
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "has_twilio_credentials": bool(m.twilio_account_sid and m.twilio_auth_token),
            "twilio_account_sid": m.twilio_account_sid[:10] + "..." if m.twilio_account_sid else None,
            "created_at": m.created_at
        })

    return result


@router.post("/phone-mappings")
def create_phone_mapping(
    mapping: PhoneMappingCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a phone number to customer mapping with optional Twilio credentials"""
    # Check if mapping already exists
    existing = db.query(models.PhoneMapping).filter(
        models.PhoneMapping.phone_number == mapping.phone_number
    ).first()

    if existing:
        # Update existing mapping
        existing.user_id = mapping.user_id
        if mapping.twilio_account_sid:
            existing.twilio_account_sid = mapping.twilio_account_sid
        if mapping.twilio_auth_token:
            existing.twilio_auth_token = mapping.twilio_auth_token
        db.commit()
        return {"message": "Phone mapping updated", "id": existing.id}

    # Verify user exists
    user = db.query(models.User).filter(
        models.User.id == mapping.user_id,
        models.User.role == "customer"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Create new mapping
    new_mapping = models.PhoneMapping(
        phone_number=mapping.phone_number,
        user_id=mapping.user_id,
        twilio_account_sid=mapping.twilio_account_sid,
        twilio_auth_token=mapping.twilio_auth_token
    )
    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)

    return {"message": "Phone mapping created", "id": new_mapping.id}


@router.delete("/phone-mappings/{mapping_id}")
def delete_phone_mapping(
    mapping_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a phone number mapping"""
    mapping = db.query(models.PhoneMapping).filter(
        models.PhoneMapping.id == mapping_id
    ).first()

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    db.delete(mapping)
    db.commit()

    return {"message": "Mapping deleted"}


@router.post("/sync-twilio-messages")
def sync_twilio_messages(
    background_tasks: BackgroundTasks,
    days_back: int = Query(7, description="Number of days to sync"),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Sync messages from Twilio API.
    Maps messages to customers based on phone number mappings.
    Supports per-customer Twilio credentials (for subaccounts).
    """
    from twilio.rest import Client as TwilioClient

    # Get all phone mappings
    mappings = db.query(models.PhoneMapping).all()

    if not mappings:
        raise HTTPException(status_code=400, detail="No phone mappings configured. Please add phone to customer mappings first.")

    # Group mappings by Twilio credentials
    # Key: (account_sid, auth_token), Value: list of mappings
    credential_groups = {}
    for m in mappings:
        # Use per-customer credentials if available, otherwise use global
        account_sid = m.twilio_account_sid or TWILIO_ACCOUNT_SID
        auth_token = m.twilio_auth_token or TWILIO_AUTH_TOKEN

        if not account_sid or not auth_token:
            continue  # Skip mappings without credentials

        key = (account_sid, auth_token)
        if key not in credential_groups:
            credential_groups[key] = []
        credential_groups[key].append(m)

    if not credential_groups:
        raise HTTPException(status_code=400, detail="No Twilio credentials configured for any mapping")

    # Get pricing
    template_pricing = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "template"
    ).first()
    session_pricing = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "session"
    ).first()

    template_cost = template_pricing.price if template_pricing else 200
    session_cost = session_pricing.price if session_pricing else 100

    # Calculate date range
    date_from = datetime.utcnow() - timedelta(days=days_back)

    imported_count = 0
    skipped_count = 0
    no_mapping_count = 0
    user_stats = {}  # Track per-user stats

    # Process each Twilio credential group separately
    for (account_sid, auth_token), group_mappings in credential_groups.items():
        try:
            client = TwilioClient(account_sid, auth_token)
        except Exception as e:
            continue  # Skip this credential group if client fails

        # Build phone to user mapping for this group
        phone_to_user = {m.phone_number: m.user_id for m in group_mappings}

        # Fetch messages from this Twilio account
        try:
            twilio_messages = client.messages.list(
                date_sent_after=date_from,
                limit=1000
            )
        except Exception as e:
            continue  # Skip this credential group if fetch fails

        for msg in twilio_messages:
            # Skip if already exists
            if msg.sid:
                existing = db.query(models.Message).filter(
                    models.Message.whatsapp_message_id == msg.sid
                ).first()
                if existing:
                    skipped_count += 1
                    continue

            # Determine sender/recipient and find user
            from_number = msg.from_.replace('whatsapp:', '') if msg.from_ else ''
            to_number = msg.to.replace('whatsapp:', '') if msg.to else ''

            # Check direction
            is_outbound = msg.direction and 'outbound' in msg.direction.lower()

            # Find user based on from number (for outbound) or to number (for inbound)
            user_id = None
            if is_outbound:
                user_id = phone_to_user.get(from_number)
            else:
                user_id = phone_to_user.get(to_number)

            if not user_id:
                no_mapping_count += 1
                continue

            # Determine message type (default to template for outbound, session for inbound)
            if is_outbound:
                msg_type = 'template'
                message_cost = template_cost
            else:
                msg_type = 'session'
                message_cost = 0  # Don't charge for inbound

            # Determine recipient phone
            recipient_phone = to_number if is_outbound else from_number

            # Map status
            status_map = {
                'delivered': 'delivered',
                'sent': 'sent',
                'read': 'read',
                'failed': 'failed',
                'undelivered': 'failed',
                'received': 'delivered',
                'queued': 'pending',
                'sending': 'pending'
            }
            mapped_status = status_map.get(msg.status.lower() if msg.status else 'sent', 'sent')

            # Calculate cost (only for outbound, non-failed)
            msg_cost = message_cost if (is_outbound and mapped_status != 'failed') else 0

            # Create message record
            message = models.Message(
                user_id=user_id,
                recipient_phone=recipient_phone,
                recipient_name=None,
                message_type=msg_type,
                template_name=f"Twilio Sync - {msg_type}" if msg_type == "template" else None,
                message_content=msg.body or '',
                direction='outbound' if is_outbound else 'inbound',
                status=mapped_status,
                whatsapp_message_id=msg.sid,
                cost=msg_cost,
                created_at=msg.date_sent or datetime.utcnow(),
                sent_at=msg.date_sent,
                delivered_at=msg.date_sent if mapped_status == 'delivered' else None,
                read_at=msg.date_sent if mapped_status == 'read' else None,
                error_message=msg.error_message if hasattr(msg, 'error_message') else None
            )
            db.add(message)
            imported_count += 1

            # Track user stats
            if user_id not in user_stats:
                user_stats[user_id] = {'count': 0, 'cost': 0, 'template': 0, 'session': 0}
            user_stats[user_id]['count'] += 1
            user_stats[user_id]['cost'] += msg_cost
            if msg_type == 'template':
                user_stats[user_id]['template'] += 1
            else:
                user_stats[user_id]['session'] += 1

    # Deduct balance for each user
    for user_id, stats in user_stats.items():
        if stats['cost'] > 0:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                user.balance -= stats['cost']

                # Create transaction
                description_parts = []
                if stats['template'] > 0:
                    description_parts.append(f"{stats['template']} template")
                if stats['session'] > 0:
                    description_parts.append(f"{stats['session']} session")

                transaction = models.Transaction(
                    user_id=user_id,
                    type="debit",
                    amount=stats['cost'],
                    description=f"Twilio Sync: {' + '.join(description_parts)}",
                    status="completed"
                )
                db.add(transaction)

                # Check for low balance and send alert in background
                background_tasks.add_task(check_and_send_low_balance_alert, user)

    db.commit()

    return {
        "message": "Twilio sync completed",
        "imported": imported_count,
        "skipped": skipped_count,
        "no_mapping": no_mapping_count,
        "user_stats": {
            str(uid): {
                "messages": s['count'],
                "cost_rupees": s['cost'] / 100,
                "template": s['template'],
                "session": s['session']
            }
            for uid, s in user_stats.items()
        }
    }


# ========== Payment Logs Endpoints ==========

@router.get("/payment-logs")
def get_payment_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_id: int = Query(None, description="Filter by user ID"),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all payment logs for auditing/reporting"""
    query = db.query(models.PaymentLog)

    if user_id:
        query = query.filter(models.PaymentLog.user_id == user_id)

    total = query.count()
    logs = query.order_by(models.PaymentLog.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "source": log.source,
                "razorpay_payment_id": log.razorpay_payment_id,
                "razorpay_order_id": log.razorpay_order_id,
                "user_id": log.user_id,
                "user_email": log.user_email,
                "user_name": log.user_name,
                "user_phone": log.user_phone,
                "company_name": log.company_name,
                "gst_number": log.gst_number,
                "total_amount_paise": log.total_amount,
                "total_amount_rupees": log.total_amount / 100 if log.total_amount else None,
                "subtotal_paise": log.subtotal_amount,
                "gst_paise": log.gst_amount,
                "credited_paise": log.credited_amount,
                "credited_rupees": log.credited_amount / 100 if log.credited_amount else None,
                "invoice_number": log.invoice_number,
                "invoice_id": log.invoice_id,
                "new_balance_paise": log.new_balance,
                "new_balance_rupees": log.new_balance / 100 if log.new_balance else None,
                "created_at": log.created_at
            }
            for log in logs
        ]
    }


@router.get("/payment-logs/{log_id}")
def get_payment_log_detail(
    log_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed payment log including raw data"""
    log = db.query(models.PaymentLog).filter(models.PaymentLog.id == log_id).first()

    if not log:
        raise HTTPException(status_code=404, detail="Payment log not found")

    import json
    return {
        "id": log.id,
        "event_type": log.event_type,
        "source": log.source,
        "razorpay_payment_id": log.razorpay_payment_id,
        "razorpay_order_id": log.razorpay_order_id,
        "razorpay_signature": log.razorpay_signature,
        "user": {
            "id": log.user_id,
            "email": log.user_email,
            "name": log.user_name,
            "phone": log.user_phone,
            "company_name": log.company_name,
            "gst_number": log.gst_number
        },
        "amount": {
            "total_paise": log.total_amount,
            "total_rupees": log.total_amount / 100 if log.total_amount else None,
            "subtotal_paise": log.subtotal_amount,
            "subtotal_rupees": log.subtotal_amount / 100 if log.subtotal_amount else None,
            "gst_paise": log.gst_amount,
            "gst_rupees": log.gst_amount / 100 if log.gst_amount else None,
            "cgst_paise": log.cgst_amount,
            "sgst_paise": log.sgst_amount,
            "credited_paise": log.credited_amount,
            "credited_rupees": log.credited_amount / 100 if log.credited_amount else None
        },
        "invoice_number": log.invoice_number,
        "invoice_id": log.invoice_id,
        "new_balance_paise": log.new_balance,
        "new_balance_rupees": log.new_balance / 100 if log.new_balance else None,
        "raw_data": json.loads(log.raw_data) if log.raw_data else None,
        "created_at": log.created_at
    }


@router.get("/payment-logs/export/csv")
def export_payment_logs_csv(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Export all payment logs as CSV"""
    logs = db.query(models.PaymentLog).order_by(models.PaymentLog.created_at.desc()).all()

    # Build CSV content
    csv_lines = [
        "ID,Event,Source,Razorpay Payment ID,Razorpay Order ID,User ID,User Email,User Name,Phone,Company,GST Number,Total (Paise),Total (Rs),Subtotal,GST,Credited,Invoice Number,New Balance,Created At"
    ]

    for log in logs:
        csv_lines.append(
            f"{log.id},{log.event_type},{log.source},{log.razorpay_payment_id},{log.razorpay_order_id},"
            f"{log.user_id},{log.user_email},{log.user_name},{log.user_phone},{log.company_name},{log.gst_number},"
            f"{log.total_amount},{log.total_amount / 100 if log.total_amount else ''},"
            f"{log.subtotal_amount},{log.gst_amount},{log.credited_amount},"
            f"{log.invoice_number},{log.new_balance},{log.created_at}"
        )

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content="\n".join(csv_lines),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=payment_logs.csv"}
    )


# ========== Public Payment Logs API (API Key Authentication) ==========
# These endpoints can be shared with external systems using an API key

# Get API key from environment
PAYMENT_LOGS_API_KEY = os.getenv("PAYMENT_LOGS_API_KEY", "")


def verify_api_key(api_key: str = Query(..., description="API key for authentication")):
    """Verify API key for public endpoints"""
    if not PAYMENT_LOGS_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured on server")
    if api_key != PAYMENT_LOGS_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


@router.get("/public/payment-logs")
def get_public_payment_logs(
    api_key: str = Query(..., description="API key for authentication"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_id: int = Query(None, description="Filter by user ID"),
    db: Session = Depends(get_db)
):
    """
    Public endpoint to get payment logs using API key.

    Share this URL with others:
    GET /api/admin/public/payment-logs?api_key=YOUR_API_KEY&limit=50
    """
    verify_api_key(api_key)

    query = db.query(models.PaymentLog)

    if user_id:
        query = query.filter(models.PaymentLog.user_id == user_id)

    total = query.count()
    logs = query.order_by(models.PaymentLog.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "source": log.source,
                "razorpay_payment_id": log.razorpay_payment_id,
                "razorpay_order_id": log.razorpay_order_id,
                "user_id": log.user_id,
                "user_email": log.user_email,
                "user_name": log.user_name,
                "user_phone": log.user_phone,
                "company_name": log.company_name,
                "gst_number": log.gst_number,
                "total_amount_paise": log.total_amount,
                "total_amount_rupees": log.total_amount / 100 if log.total_amount else None,
                "subtotal_paise": log.subtotal_amount,
                "gst_paise": log.gst_amount,
                "credited_paise": log.credited_amount,
                "credited_rupees": log.credited_amount / 100 if log.credited_amount else None,
                "invoice_number": log.invoice_number,
                "invoice_id": log.invoice_id,
                "new_balance_paise": log.new_balance,
                "new_balance_rupees": log.new_balance / 100 if log.new_balance else None,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }


@router.get("/public/payment-logs/{log_id}")
def get_public_payment_log_detail(
    log_id: int,
    api_key: str = Query(..., description="API key for authentication"),
    db: Session = Depends(get_db)
):
    """
    Public endpoint to get detailed payment log using API key.

    Share this URL:
    GET /api/admin/public/payment-logs/123?api_key=YOUR_API_KEY
    """
    verify_api_key(api_key)

    log = db.query(models.PaymentLog).filter(models.PaymentLog.id == log_id).first()

    if not log:
        raise HTTPException(status_code=404, detail="Payment log not found")

    import json
    return {
        "id": log.id,
        "event_type": log.event_type,
        "source": log.source,
        "razorpay_payment_id": log.razorpay_payment_id,
        "razorpay_order_id": log.razorpay_order_id,
        "razorpay_signature": log.razorpay_signature,
        "user": {
            "id": log.user_id,
            "email": log.user_email,
            "name": log.user_name,
            "phone": log.user_phone,
            "company_name": log.company_name,
            "gst_number": log.gst_number
        },
        "amount": {
            "total_paise": log.total_amount,
            "total_rupees": log.total_amount / 100 if log.total_amount else None,
            "subtotal_paise": log.subtotal_amount,
            "subtotal_rupees": log.subtotal_amount / 100 if log.subtotal_amount else None,
            "gst_paise": log.gst_amount,
            "gst_rupees": log.gst_amount / 100 if log.gst_amount else None,
            "cgst_paise": log.cgst_amount,
            "sgst_paise": log.sgst_amount,
            "credited_paise": log.credited_amount,
            "credited_rupees": log.credited_amount / 100 if log.credited_amount else None
        },
        "invoice_number": log.invoice_number,
        "invoice_id": log.invoice_id,
        "new_balance_paise": log.new_balance,
        "new_balance_rupees": log.new_balance / 100 if log.new_balance else None,
        "raw_data": json.loads(log.raw_data) if log.raw_data else None,
        "created_at": log.created_at.isoformat() if log.created_at else None
    }


@router.get("/public/payment-logs/export/csv")
def export_public_payment_logs_csv(
    api_key: str = Query(..., description="API key for authentication"),
    db: Session = Depends(get_db)
):
    """
    Public endpoint to export payment logs as CSV using API key.

    Share this URL:
    GET /api/admin/public/payment-logs/export/csv?api_key=YOUR_API_KEY
    """
    verify_api_key(api_key)

    logs = db.query(models.PaymentLog).order_by(models.PaymentLog.created_at.desc()).all()

    csv_lines = [
        "ID,Event,Source,Razorpay Payment ID,Razorpay Order ID,User ID,User Email,User Name,Phone,Company,GST Number,Total (Paise),Total (Rs),Subtotal,GST,Credited,Invoice Number,New Balance,Created At"
    ]

    for log in logs:
        csv_lines.append(
            f"{log.id},{log.event_type},{log.source},{log.razorpay_payment_id},{log.razorpay_order_id},"
            f"{log.user_id},{log.user_email},{log.user_name},{log.user_phone},{log.company_name},{log.gst_number},"
            f"{log.total_amount},{log.total_amount / 100 if log.total_amount else ''},"
            f"{log.subtotal_amount},{log.gst_amount},{log.credited_amount},"
            f"{log.invoice_number},{log.new_balance},{log.created_at}"
        )

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content="\n".join(csv_lines),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=payment_logs.csv"}
    )


# GST rate (same as in payments.py)
GST_RATE = 0.18

def calculate_gst(total_amount_paise: int):
    """Calculate GST breakdown from total amount"""
    subtotal = int(total_amount_paise / (1 + GST_RATE))
    gst_amount = total_amount_paise - subtotal
    cgst = gst_amount // 2
    sgst = gst_amount - cgst
    return {
        "subtotal": subtotal,
        "cgst": cgst,
        "sgst": sgst,
        "igst": 0,
        "total": total_amount_paise,
        "credited": subtotal
    }


def generate_invoice_number_admin(db: Session) -> str:
    """Generate unique invoice number like TZ-2024-0001"""
    year = datetime.now().year
    company = db.query(models.CompanyConfig).first()
    prefix = company.invoice_prefix if company else "TZ"
    count = db.query(models.Invoice).filter(
        models.Invoice.invoice_number.like(f"{prefix}-{year}-%")
    ).count()
    return f"{prefix}-{year}-{str(count + 1).zfill(4)}"


@router.post("/complete-pending-payment/{order_id}")
def complete_pending_payment(
    order_id: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to manually complete a pending payment.
    This fetches the payment status from Razorpay and completes it if captured.
    """
    # Find the transaction
    transaction = db.query(models.Transaction).filter(
        models.Transaction.razorpay_order_id == order_id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail=f"Transaction with order_id {order_id} not found")

    if transaction.status == "completed":
        # Get user's current balance
        user = db.query(models.User).filter(models.User.id == transaction.user_id).first()
        return {
            "status": "already_completed",
            "message": "This transaction is already completed",
            "transaction_id": transaction.id,
            "user_balance": user.balance / 100 if user else None
        }

    # Initialize Razorpay client
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay not configured")

    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Razorpay: {str(e)}")

    # Fetch order from Razorpay
    try:
        razorpay_order = client.order.fetch(order_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch order from Razorpay: {str(e)}")

    # Check order status
    if razorpay_order.get("status") != "paid":
        return {
            "status": "not_paid",
            "message": f"Order status is '{razorpay_order.get('status')}', not 'paid'",
            "razorpay_order": razorpay_order
        }

    # Order is paid, fetch payments for this order
    try:
        payments = client.order.payments(order_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch payments: {str(e)}")

    # Find the captured payment
    captured_payment = None
    for payment in payments.get("items", []):
        if payment.get("status") == "captured":
            captured_payment = payment
            break

    if not captured_payment:
        return {
            "status": "no_captured_payment",
            "message": "No captured payment found for this order",
            "payments": payments
        }

    # Get the user
    user = db.query(models.User).filter(models.User.id == transaction.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found for this transaction")

    # Calculate GST based on original transaction amount (which is total paid)
    original_amount = razorpay_order.get("amount", transaction.amount)
    gst_calc = calculate_gst(original_amount)

    # Generate invoice
    invoice_number = generate_invoice_number_admin(db)

    # Build customer address
    customer_address = None
    if user.billing_address:
        parts = [user.billing_address]
        if user.city:
            parts.append(user.city)
        if user.state:
            parts.append(user.state)
        if user.pincode:
            parts.append(user.pincode)
        customer_address = ", ".join(parts)

    # Create invoice
    invoice = models.Invoice(
        user_id=user.id,
        invoice_number=invoice_number,
        customer_name=user.name,
        customer_email=user.email,
        customer_company=user.company_name,
        customer_gst=user.gst_number,
        customer_address=customer_address,
        subtotal=gst_calc["subtotal"],
        cgst_amount=gst_calc["cgst"],
        sgst_amount=gst_calc["sgst"],
        igst_amount=gst_calc["igst"],
        total_amount=gst_calc["total"],
        credited_amount=gst_calc["credited"],
        razorpay_payment_id=captured_payment["id"],
        payment_date=datetime.utcnow(),
        status="paid"
    )
    db.add(invoice)
    db.flush()

    # Update transaction
    transaction.razorpay_payment_id = captured_payment["id"]
    transaction.status = "completed"
    transaction.invoice_id = invoice.id
    transaction.amount = gst_calc["credited"]
    transaction.description = f"Wallet recharge - Invoice #{invoice_number} (Admin completed)"

    # Add credited amount to user balance
    old_balance = user.balance
    user.balance += gst_calc["credited"]

    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "message": f"Payment completed successfully! ₹{gst_calc['credited'] / 100:.2f} added to wallet",
        "transaction_id": transaction.id,
        "invoice_number": invoice_number,
        "razorpay_payment_id": captured_payment["id"],
        "old_balance": old_balance / 100,
        "credited_amount": gst_calc["credited"] / 100,
        "new_balance": user.balance / 100,
        "user_email": user.email
    }


@router.get("/pending-payments")
def get_pending_payments(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all pending payment transactions (credit transactions with pending status).
    """
    transactions = db.query(models.Transaction).filter(
        models.Transaction.type == "credit",
        models.Transaction.status == "pending"
    ).order_by(models.Transaction.created_at.desc()).all()

    result = []
    for t in transactions:
        user = db.query(models.User).filter(models.User.id == t.user_id).first()
        result.append({
            "id": t.id,
            "razorpay_order_id": t.razorpay_order_id,
            "amount": t.amount,
            "amount_rupees": t.amount / 100,
            "user_id": t.user_id,
            "user_email": user.email if user else None,
            "user_name": user.name if user else None,
            "created_at": t.created_at,
            "description": t.description
        })

    return {
        "total": len(result),
        "pending_payments": result
    }


# ========== Low Balance Alerts ==========

from ..email_utils import LOW_BALANCE_THRESHOLD, send_low_balance_alert

@router.get("/low-balance-users")
def get_low_balance_users(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all customers with balance below the threshold (Rs.200).
    """
    threshold_rupees = LOW_BALANCE_THRESHOLD / 100

    # Get all active customers with balance below threshold
    users = db.query(models.User).filter(
        models.User.balance < LOW_BALANCE_THRESHOLD,
        models.User.role == "customer",
        models.User.is_active == True
    ).order_by(models.User.balance.asc()).all()

    return {
        "threshold_paise": LOW_BALANCE_THRESHOLD,
        "threshold_rupees": threshold_rupees,
        "total": len(users),
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "company_name": user.company_name,
                "phone": user.phone,
                "balance_paise": user.balance,
                "balance_rupees": user.balance / 100
            }
            for user in users
        ]
    }


@router.post("/send-low-balance-alerts")
def send_low_balance_alerts(
    user_ids: Optional[List[int]] = None,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Send low balance alert emails to customers.

    - If user_ids is provided, send only to those users
    - If user_ids is None/empty, send to all users below threshold
    """
    # Build query
    query = db.query(models.User).filter(
        models.User.balance < LOW_BALANCE_THRESHOLD,
        models.User.role == "customer",
        models.User.is_active == True
    )

    # Filter by specific user IDs if provided
    if user_ids:
        query = query.filter(models.User.id.in_(user_ids))

    users = query.all()

    if not users:
        return {
            "message": "No users to send alerts to",
            "sent": 0,
            "failed": 0
        }

    sent_count = 0
    failed_count = 0
    results = []

    for user in users:
        success = send_low_balance_alert(
            user_email=user.email,
            user_name=user.name,
            balance_paise=user.balance,
            company_name=user.company_name
        )

        if success:
            sent_count += 1
            results.append({
                "user_id": user.id,
                "email": user.email,
                "status": "sent"
            })
        else:
            failed_count += 1
            results.append({
                "user_id": user.id,
                "email": user.email,
                "status": "failed"
            })

    return {
        "message": f"Sent {sent_count} alert(s), {failed_count} failed",
        "sent": sent_count,
        "failed": failed_count,
        "results": results
    }


# ========== Campaign Overview ==========

@router.get("/campaign-overview")
def get_admin_campaign_overview(
    start_date: str = Query(..., description="Start date in ISO format (YYYY-MM-DDTHH:MM:SS)"),
    end_date: str = Query(..., description="End date in ISO format (YYYY-MM-DDTHH:MM:SS)"),
    user_id: Optional[int] = Query(None, description="Filter by specific user ID"),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get campaign overview with message statistics for admin.
    Can filter by user_id or get stats for all users.
    """
    try:
        start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601 format.")

    # Build query
    query = db.query(models.Message).filter(
        models.Message.created_at >= start_datetime,
        models.Message.created_at <= end_datetime
    )

    if user_id:
        query = query.filter(models.Message.user_id == user_id)

    messages = query.all()

    # Calculate statistics
    total_messages = len(messages)

    if total_messages == 0:
        return {
            "total_messages": 0,
            "sent": 0,
            "delivered": 0,
            "read": 0,
            "replied": 0,
            "failed": 0,
            "pending": 0,
            "campaign_status": "NO DATA",
            "campaign_name": "No Campaign",
            "trigger_campaign": "N/A",
            "processed_at": None,
            "audience_type": "N/A",
            "audience_size": 0,
            "message_count": 0,
            "message_type": "N/A",
            "avg_delivery_time": "N/A",
            "date_range": {"start": start_date, "end": end_date}
        }

    status_breakdown = {
        "sent": 0,
        "delivered": 0,
        "read": 0,
        "failed": 0,
        "pending": 0
    }

    delivery_times = []
    unique_recipients = set()

    for message in messages:
        status = message.status.lower() if message.status else "pending"
        if status in status_breakdown:
            status_breakdown[status] += 1
        unique_recipients.add(message.recipient_phone)

        if message.sent_at and message.delivered_at:
            delivery_time = (message.delivered_at - message.sent_at).total_seconds()
            delivery_times.append(delivery_time)

    # Calculate average delivery time
    avg_delivery_time = "N/A"
    if delivery_times:
        avg_seconds = sum(delivery_times) / len(delivery_times)
        if avg_seconds < 60:
            avg_delivery_time = f"{avg_seconds:.0f}s"
        else:
            avg_minutes = avg_seconds / 60
            avg_delivery_time = f"{avg_minutes:.1f}m"

    # Get message types
    message_types = db.query(models.Message.message_type).filter(
        models.Message.created_at >= start_datetime,
        models.Message.created_at <= end_datetime
    )
    if user_id:
        message_types = message_types.filter(models.Message.user_id == user_id)
    message_types = message_types.distinct().all()
    message_type_str = ", ".join([mt[0].capitalize() for mt in message_types if mt[0]]) if message_types else "Mixed"

    # Get latest message time as processed_at
    latest_message = query.order_by(models.Message.created_at.desc()).first()
    processed_at = latest_message.created_at.isoformat() if latest_message else None

    return {
        "total_messages": total_messages,
        "sent": status_breakdown["sent"],
        "delivered": status_breakdown["delivered"],
        "read": status_breakdown["read"],
        "replied": 0,  # Would need reply tracking
        "failed": status_breakdown["failed"],
        "pending": status_breakdown["pending"],
        "campaign_status": "COMPLETED" if status_breakdown["pending"] == 0 else "IN PROGRESS",
        "campaign_name": "WhatsApp Campaign",
        "trigger_campaign": "Immediately",
        "processed_at": processed_at,
        "audience_type": "All Users" if not user_id else "Segmented",
        "audience_size": len(unique_recipients),
        "message_count": total_messages,
        "message_type": message_type_str,
        "avg_delivery_time": avg_delivery_time,
        "date_range": {"start": start_date, "end": end_date}
    }


# ========== Public Customer Management (Portal Recharge) ==========

class PublicCustomerCreate(BaseModel):
    phone: str
    name: str
    user_id: Optional[int] = None
    notes: Optional[str] = None


class PublicCustomerUpdate(BaseModel):
    name: Optional[str] = None
    user_id: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/public-customers")
def get_public_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query(None),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all public customer mappings for portal recharge"""
    query = db.query(models.PublicCustomer)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.PublicCustomer.phone.ilike(search_filter)) |
            (models.PublicCustomer.name.ilike(search_filter))
        )

    total = query.count()
    customers = query.order_by(models.PublicCustomer.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for c in customers:
        user = None
        if c.user_id:
            user = db.query(models.User).filter(models.User.id == c.user_id).first()

        result.append({
            "id": c.id,
            "phone": c.phone,
            "name": c.name,
            "user_id": c.user_id,
            "user_email": user.email if user else None,
            "user_name": user.name if user else None,
            "user_balance": user.balance / 100 if user else None,
            "notes": c.notes,
            "is_active": c.is_active,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        })

    return {"total": total, "customers": result}


@router.post("/public-customers")
def create_public_customer(
    customer: PublicCustomerCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new public customer mapping"""
    # Clean phone number
    phone = ''.join(filter(str.isdigit, customer.phone))
    if len(phone) == 12 and phone.startswith('91'):
        phone = phone[2:]

    # Check if already exists
    existing = db.query(models.PublicCustomer).filter(
        models.PublicCustomer.phone == phone
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    # Note: user_id is not validated - admin can enter any ID for manual mapping later

    new_customer = models.PublicCustomer(
        phone=phone,
        name=customer.name,
        user_id=customer.user_id,
        notes=customer.notes
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    return {"message": "Public customer created", "id": new_customer.id, "phone": phone}


@router.put("/public-customers/{customer_id}")
def update_public_customer(
    customer_id: int,
    update: PublicCustomerUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a public customer mapping"""
    customer = db.query(models.PublicCustomer).filter(
        models.PublicCustomer.id == customer_id
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Public customer not found")

    if update.name is not None:
        customer.name = update.name
    if update.user_id is not None:
        # No validation - admin can enter any ID for manual mapping
        customer.user_id = update.user_id if update.user_id > 0 else None
    if update.notes is not None:
        customer.notes = update.notes
    if update.is_active is not None:
        customer.is_active = update.is_active

    db.commit()
    db.refresh(customer)

    return {"message": "Public customer updated", "id": customer.id}


@router.delete("/public-customers/{customer_id}")
def delete_public_customer(
    customer_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a public customer mapping"""
    customer = db.query(models.PublicCustomer).filter(
        models.PublicCustomer.id == customer_id
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Public customer not found")

    db.delete(customer)
    db.commit()

    return {"message": "Public customer deleted"}


# ========== Public Payments Management ==========

@router.get("/public-payments")
def get_public_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str = Query(None),
    processed: bool = Query(None),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all public portal payments"""
    query = db.query(models.PublicPayment)

    if status:
        query = query.filter(models.PublicPayment.status == status)
    if processed is not None:
        query = query.filter(models.PublicPayment.processed == processed)

    total = query.count()
    payments = query.order_by(models.PublicPayment.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for p in payments:
        result.append({
            "id": p.id,
            "phone": p.phone,
            "customer_name": p.customer_name,
            "public_customer_id": p.public_customer_id,
            "user_id": p.user_id,
            "amount": p.amount,
            "amount_rupees": p.amount / 100,
            "razorpay_order_id": p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "status": p.status,
            "subtotal": p.subtotal,
            "gst_amount": p.gst_amount,
            "credited_amount": p.credited_amount,
            "credited_rupees": p.credited_amount / 100 if p.credited_amount else None,
            "processed": p.processed,
            "processed_at": p.processed_at,
            "admin_notes": p.admin_notes,
            "created_at": p.created_at
        })

    return {"total": total, "payments": result}


@router.post("/public-payments/{payment_id}/process")
def process_public_payment(
    payment_id: int,
    user_id: int = Query(..., description="User ID to credit the balance to"),
    admin_notes: str = Query(None),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Manually process a public payment - credit the amount to a user's wallet.
    This is used when admin wants to credit a portal payment to a user account.
    """
    payment = db.query(models.PublicPayment).filter(
        models.PublicPayment.id == payment_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.processed:
        raise HTTPException(status_code=400, detail="Payment already processed")

    if payment.status != "completed":
        raise HTTPException(status_code=400, detail="Payment is not completed")

    # Get user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate GST (already in payment record)
    credited_amount = payment.credited_amount or payment.subtotal or int(payment.amount / 1.18)

    # Create transaction
    transaction = models.Transaction(
        user_id=user.id,
        amount=credited_amount,
        type="credit",
        status="completed",
        razorpay_order_id=payment.razorpay_order_id,
        razorpay_payment_id=payment.razorpay_payment_id,
        description=f"Portal Recharge from {payment.phone} (Admin processed)"
    )
    db.add(transaction)

    # Update user balance
    old_balance = user.balance
    user.balance += credited_amount

    # Mark payment as processed
    payment.processed = True
    payment.processed_at = datetime.utcnow()
    payment.processed_by = admin.id
    payment.user_id = user.id
    payment.admin_notes = admin_notes

    db.commit()

    return {
        "message": "Payment processed successfully",
        "payment_id": payment.id,
        "user_id": user.id,
        "user_email": user.email,
        "credited_amount": credited_amount / 100,
        "old_balance": old_balance / 100,
        "new_balance": user.balance / 100
    }
