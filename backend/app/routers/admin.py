from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import csv
import io
import os
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_admin

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
            "balance": user.balance,
            "balance_rupees": user.balance / 100,
            "is_active": user.is_active
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

class PhoneMappingResponse(BaseModel):
    id: int
    phone_number: str
    user_id: int
    user_name: str
    user_email: str
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
            "created_at": m.created_at
        })

    return result


@router.post("/phone-mappings")
def create_phone_mapping(
    mapping: PhoneMappingCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a phone number to customer mapping"""
    # Check if mapping already exists
    existing = db.query(models.PhoneMapping).filter(
        models.PhoneMapping.phone_number == mapping.phone_number
    ).first()

    if existing:
        # Update existing mapping
        existing.user_id = mapping.user_id
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
        user_id=mapping.user_id
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
    days_back: int = Query(7, description="Number of days to sync"),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Sync messages from Twilio API.
    Maps messages to customers based on phone number mappings.
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=400, detail="Twilio credentials not configured")

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except ImportError:
        raise HTTPException(status_code=500, detail="Twilio SDK not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Twilio client: {str(e)}")

    # Get all phone mappings
    mappings = db.query(models.PhoneMapping).all()
    phone_to_user = {m.phone_number: m.user_id for m in mappings}

    if not phone_to_user:
        raise HTTPException(status_code=400, detail="No phone mappings configured. Please add phone to customer mappings first.")

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

    # Fetch messages from Twilio
    try:
        twilio_messages = client.messages.list(
            date_sent_after=date_from,
            limit=1000
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Twilio messages: {str(e)}")

    imported_count = 0
    skipped_count = 0
    no_mapping_count = 0
    user_stats = {}  # Track per-user stats

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
