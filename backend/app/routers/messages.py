from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import httpx
import os
from twilio.rest import Client as TwilioClient
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..config import settings
from ..email_utils import check_and_send_low_balance_alert

# Twilio configuration - set these in Railway environment variables
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")

router = APIRouter(prefix="/messages", tags=["Messages"])

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

@router.post("/send", response_model=schemas.MessageResponse)
async def send_message(
    message: schemas.MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
        cost=price,
        status="pending"
    )
    db.add(db_message)
    db.flush()  # Get the message ID

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
        db_message.direction = "outbound"
        send_success = True

    except Exception as e:
        error_message = f"Failed to send: {str(e)}"
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
            description=f"{message.message_type.capitalize()} message to {message.recipient_phone}"
        )
        db.add(transaction)

        # Check for low balance and send alert in background
        background_tasks.add_task(check_and_send_low_balance_alert, current_user)

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

@router.get("/{message_id}", response_model=schemas.MessageResponse)
def get_message(
    message_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.user_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return schemas.MessageResponse(
        id=message.id,
        user_id=message.user_id,
        recipient_phone=message.recipient_phone,
        recipient_name=message.recipient_name,
        message_type=message.message_type,
        template_name=message.template_name,
        message_content=message.message_content,
        status=message.status,
        direction=message.direction or "outbound",
        whatsapp_message_id=message.whatsapp_message_id,
        cost=message.cost,
        cost_rupees=message.cost / 100,
        created_at=message.created_at,
        sent_at=message.sent_at,
        delivered_at=message.delivered_at,
        read_at=message.read_at,
        error_message=message.error_message
    )

# Webhook for WhatsApp status updates
@router.post("/webhook/status")
async def message_status_webhook(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Webhook to receive message status updates from WhatsApp API
    Adjust this based on your WhatsApp provider's webhook format
    """
    message_id = request_data.get("message_id")
    status = request_data.get("status")

    if not message_id or not status:
        raise HTTPException(status_code=400, detail="Invalid webhook data")

    message = db.query(models.Message).filter(
        models.Message.whatsapp_message_id == message_id
    ).first()

    if not message:
        return {"status": "message not found"}

    now = datetime.utcnow()

    if status == "delivered":
        message.status = "delivered"
        message.delivered_at = now
    elif status == "read":
        message.status = "read"
        message.read_at = now
    elif status == "failed":
        message.status = "failed"
        message.error_message = request_data.get("error", "Unknown error")

    db.commit()

    return {"status": "updated"}

@router.get("/campaign-overview")
def get_campaign_overview(
    start_date: str = Query(..., description="Start date in ISO format (YYYY-MM-DDTHH:MM:SS)"),
    end_date: str = Query(..., description="End date in ISO format (YYYY-MM-DDTHH:MM:SS)"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get campaign overview with message statistics and status breakdown
    Filters by date range for the current user
    """
    try:
        # Parse dates
        start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601 format.")

    # Query messages within date range
    messages = db.query(models.Message).filter(
        models.Message.user_id == current_user.id,
        models.Message.created_at >= start_datetime,
        models.Message.created_at <= end_datetime
    ).all()

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
            "campaign_name": "No Data",
            "message_type": "N/A",
            "avg_delivery_time": "N/A",
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }

    status_breakdown = {
        "sent": 0,
        "delivered": 0,
        "read": 0,
        "failed": 0,
        "pending": 0
    }

    delivery_times = []

    for message in messages:
        status = message.status.lower()
        if status in status_breakdown:
            status_breakdown[status] += 1

        # Calculate delivery time if available
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

    # Get message types breakdown
    message_types = db.query(models.Message.message_type).filter(
        models.Message.user_id == current_user.id,
        models.Message.created_at >= start_datetime,
        models.Message.created_at <= end_datetime
    ).distinct().all()

    message_type_str = ", ".join([mt[0].capitalize() for mt in message_types]) if message_types else "Mixed"

    return {
        "total_messages": total_messages,
        "sent": status_breakdown["sent"],
        "delivered": status_breakdown["delivered"],
        "read": status_breakdown["read"],
        "replied": status_breakdown["read"],  # Assuming read = replied for now
        "failed": status_breakdown["failed"],
        "pending": status_breakdown["pending"],
        "campaign_name": "WhatsApp Campaign",
        "message_type": message_type_str,
        "avg_delivery_time": avg_delivery_time,
        "date_range": {
            "start": start_date,
            "end": end_date
        }
    }