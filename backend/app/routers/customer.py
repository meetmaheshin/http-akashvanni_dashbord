from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import os
from twilio.rest import Client as TwilioClient
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

# Twilio configuration - set these in Railway environment variables
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")

router = APIRouter(prefix="/customer", tags=["Customer"])

@router.get("/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get message counts
    total_messages = db.query(models.Message).filter(
        models.Message.user_id == current_user.id
    ).count()

    today = datetime.utcnow().date()
    messages_today = db.query(models.Message).filter(
        models.Message.user_id == current_user.id,
        func.date(models.Message.created_at) == today
    ).count()

    # Messages this month
    first_of_month = today.replace(day=1)
    messages_this_month = db.query(models.Message).filter(
        models.Message.user_id == current_user.id,
        models.Message.created_at >= first_of_month
    ).count()

    # Total spent (sum of all debit transactions)
    total_spent = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "debit",
        models.Transaction.status == "completed"
    ).scalar() or 0

    return schemas.DashboardStats(
        balance=current_user.balance,
        balance_rupees=current_user.balance / 100,
        total_messages=total_messages,
        messages_today=messages_today,
        messages_this_month=messages_this_month,
        total_spent=total_spent,
        spent_rupees=total_spent / 100
    )

@router.get("/transactions", response_model=List[schemas.TransactionResponse])
def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
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

@router.get("/messages", response_model=List[schemas.MessageResponse])
def get_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    status: str = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Message).filter(models.Message.user_id == current_user.id)

    if status:
        query = query.filter(models.Message.status == status)

    messages = query.order_by(models.Message.created_at.desc()).offset(skip).limit(limit).all()

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
            direction=m.direction or "outbound",
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


def get_message_price(message_type: str, db: Session) -> int:
    """Get price for message type from config or default"""
    config = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == message_type
    ).first()

    if config:
        return config.price

    # Default prices
    if message_type == "template":
        return 200  # ₹2
    return 100  # ₹1


@router.post("/send-message", response_model=schemas.MessageResponse)
def send_message(
    message: schemas.MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a WhatsApp message via Twilio"""
    # Get price
    price = get_message_price(message.message_type, db)

    # Check balance
    if current_user.balance < price:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient balance. Required: ₹{price/100}, Available: ₹{current_user.balance/100}"
        )

    # Create message record
    db_message = models.Message(
        user_id=current_user.id,
        recipient_phone=message.recipient_phone,
        recipient_name=message.recipient_name,
        message_type=message.message_type,
        template_name=message.template_name,
        message_content=message.message_content,
        direction="outbound",
        cost=price,
        status="pending"
    )
    db.add(db_message)
    db.flush()

    # Send via Twilio WhatsApp API
    send_success = False
    error_message = None

    try:
        # Initialize Twilio client
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        # Format phone number for WhatsApp
        recipient = message.recipient_phone
        if not recipient.startswith('+'):
            recipient = '+' + recipient

        # Send WhatsApp message via Twilio
        twilio_message = twilio_client.messages.create(
            body=message.message_content,
            from_=f'whatsapp:{TWILIO_WHATSAPP_NUMBER}',
            to=f'whatsapp:{recipient}'
        )

        db_message.whatsapp_message_id = twilio_message.sid
        db_message.status = "sent"
        db_message.sent_at = datetime.utcnow()
        send_success = True

    except Exception as e:
        error_message = str(e)
        db_message.status = "failed"
        db_message.error_message = error_message

    # Deduct balance and create transaction only if sent successfully
    if send_success:
        current_user.balance -= price

        transaction = models.Transaction(
            user_id=current_user.id,
            amount=price,
            type="debit",
            status="completed",
            message_id=db_message.id,
            description=f"WhatsApp message to {message.recipient_phone}"
        )
        db.add(transaction)

    db.commit()
    db.refresh(db_message)

    return schemas.MessageResponse(
        id=db_message.id,
        user_id=db_message.user_id,
        recipient_phone=db_message.recipient_phone,
        recipient_name=db_message.recipient_name,
        message_type=db_message.message_type,
        template_name=db_message.template_name,
        message_content=db_message.message_content,
        status=db_message.status,
        direction=db_message.direction or "outbound",
        whatsapp_message_id=db_message.whatsapp_message_id,
        cost=db_message.cost,
        cost_rupees=db_message.cost / 100,
        created_at=db_message.created_at,
        sent_at=db_message.sent_at,
        error_message=db_message.error_message
    )

@router.get("/balance")
def get_balance(current_user: models.User = Depends(get_current_user)):
    return {
        "balance_paise": current_user.balance,
        "balance_rupees": current_user.balance / 100
    }

@router.get("/pricing", response_model=schemas.PricingResponse)
def get_pricing(db: Session = Depends(get_db)):
    template_config = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "template"
    ).first()

    session_config = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "session"
    ).first()

    # Default pricing if not configured
    template_price = template_config.price if template_config else 200  # ₹2
    session_price = session_config.price if session_config else 100    # ₹1

    return schemas.PricingResponse(
        template_price=template_price,
        session_price=session_price,
        template_price_rupees=template_price / 100,
        session_price_rupees=session_price / 100
    )

@router.get("/profile", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(get_current_user)):
    """Get current user's profile details"""
    return current_user

@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    profile_data: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile including GST details"""
    update_data = profile_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user
