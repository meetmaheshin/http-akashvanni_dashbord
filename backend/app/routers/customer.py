from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import os
import requests
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

@router.post("/sync-messages")
def sync_customer_messages(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Auto-sync messages from Twilio for the current customer.
    This runs automatically when customer opens Messages page.
    Uses per-customer Twilio credentials if configured, otherwise falls back to global.
    """
    # Find phone mapping for this user
    mapping = db.query(models.PhoneMapping).filter(
        models.PhoneMapping.user_id == current_user.id
    ).first()

    if not mapping:
        # No mapping for this user, silently return
        return {"synced": 0, "message": "No phone mapping configured"}

    # Use per-customer Twilio credentials if available, otherwise use global
    account_sid = mapping.twilio_account_sid or TWILIO_ACCOUNT_SID
    auth_token = mapping.twilio_auth_token or TWILIO_AUTH_TOKEN

    if not account_sid or not auth_token:
        # No Twilio credentials configured
        return {"synced": 0, "message": "Twilio not configured"}

    try:
        twilio_client = TwilioClient(account_sid, auth_token)
    except Exception as e:
        return {"synced": 0, "message": f"Twilio client error: {str(e)}"}

    # Get pricing
    template_pricing = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "template"
    ).first()
    session_pricing = db.query(models.PricingConfig).filter(
        models.PricingConfig.message_type == "session"
    ).first()

    template_cost = template_pricing.price if template_pricing else 200
    session_cost = session_pricing.price if session_pricing else 100

    # Sync last 3 days by default for auto-sync
    date_from = datetime.utcnow() - timedelta(days=3)

    try:
        # Fetch messages involving this phone number
        twilio_messages = twilio_client.messages.list(
            date_sent_after=date_from,
            limit=500
        )
    except Exception as e:
        return {"synced": 0, "message": f"Failed to fetch: {str(e)}"}

    imported_count = 0
    total_cost = 0
    user_phone = mapping.phone_number

    for msg in twilio_messages:
        # Check if this message involves the user's mapped phone
        from_number = msg.from_.replace('whatsapp:', '') if msg.from_ else ''
        to_number = msg.to.replace('whatsapp:', '') if msg.to else ''

        # Only process messages to/from this user's phone
        if from_number != user_phone and to_number != user_phone:
            continue

        # Skip if already exists
        if msg.sid:
            existing = db.query(models.Message).filter(
                models.Message.whatsapp_message_id == msg.sid
            ).first()
            if existing:
                continue

        # Determine direction
        is_outbound = from_number == user_phone

        # Message type and cost
        if is_outbound:
            msg_type = 'template'
            message_cost = template_cost
        else:
            msg_type = 'session'
            message_cost = 0  # Don't charge for inbound

        # Recipient phone
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
        total_cost += msg_cost

        # Create message record
        message = models.Message(
            user_id=current_user.id,
            recipient_phone=recipient_phone,
            recipient_name=None,
            message_type=msg_type,
            template_name=f"Twilio Sync" if msg_type == "template" else None,
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

    # Deduct balance if there's a cost
    if total_cost > 0:
        current_user.balance -= total_cost

        transaction = models.Transaction(
            user_id=current_user.id,
            type="debit",
            amount=total_cost,
            description=f"Auto-sync: {imported_count} messages",
            status="completed"
        )
        db.add(transaction)

    if imported_count > 0:
        db.commit()

    return {
        "synced": imported_count,
        "cost_rupees": total_cost / 100,
        "message": f"Synced {imported_count} new messages"
    }


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


# ============== WhatsApp Templates API ==============

class TemplateVariable(BaseModel):
    type: str = "text"
    text: Optional[str] = None

class TemplateCreateRequest(BaseModel):
    friendly_name: str
    language: str = "en"
    category: str = "MARKETING"  # MARKETING, UTILITY, AUTHENTICATION
    template_type: str = "twilio/text"  # twilio/text, twilio/media, twilio/call-to-action, etc.
    body: str
    # Optional fields for more complex templates
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    # Sample values for variables (required by WhatsApp for approval)
    # Format: {"1": "John", "2": "12345"} for {{1}} and {{2}}
    variable_samples: Optional[dict] = None


def get_user_twilio_credentials(current_user: models.User, db: Session):
    """Get Twilio credentials for the current user (from mapping or global)"""
    mapping = db.query(models.PhoneMapping).filter(
        models.PhoneMapping.user_id == current_user.id
    ).first()

    if mapping and mapping.twilio_account_sid and mapping.twilio_auth_token:
        return mapping.twilio_account_sid, mapping.twilio_auth_token

    # Fall back to global credentials
    return TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN


@router.get("/templates")
def get_templates(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all WhatsApp content templates for the user's Twilio account.
    Uses per-customer Twilio credentials if configured.
    """
    account_sid, auth_token = get_user_twilio_credentials(current_user, db)

    if not account_sid or not auth_token:
        raise HTTPException(status_code=400, detail="Twilio credentials not configured")

    try:
        # Use Twilio Content API to fetch templates
        url = f"https://content.twilio.com/v1/Content"
        response = requests.get(
            url,
            auth=(account_sid, auth_token)
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Twilio API error: {response.text}"
            )

        data = response.json()
        contents = data.get("contents", [])

        # Format response
        templates = []
        for content in contents:
            # Get approval status from WhatsApp
            approval_status = None
            approval_requests = content.get("approval_requests", {})
            if approval_requests and "whatsapp" in approval_requests:
                approval_status = approval_requests["whatsapp"].get("status")

            templates.append({
                "sid": content.get("sid"),
                "friendly_name": content.get("friendly_name"),
                "language": content.get("language"),
                "date_created": content.get("date_created"),
                "date_updated": content.get("date_updated"),
                "types": content.get("types", {}),
                "variables": content.get("variables", {}),
                "approval_status": approval_status,
                "approval_requests": approval_requests
            })

        return {
            "templates": templates,
            "count": len(templates),
            "account_sid": account_sid[:10] + "..." if account_sid else None
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")


@router.get("/templates/{template_sid}")
def get_template_detail(
    template_sid: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific template"""
    account_sid, auth_token = get_user_twilio_credentials(current_user, db)

    if not account_sid or not auth_token:
        raise HTTPException(status_code=400, detail="Twilio credentials not configured")

    try:
        url = f"https://content.twilio.com/v1/Content/{template_sid}"
        response = requests.get(
            url,
            auth=(account_sid, auth_token)
        )

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Template not found")

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Twilio API error: {response.text}"
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch template: {str(e)}")


@router.post("/templates")
def create_template(
    template: TemplateCreateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new WhatsApp content template and submit for approval.
    Templates need to be approved by WhatsApp before they can be used.
    """
    account_sid, auth_token = get_user_twilio_credentials(current_user, db)

    if not account_sid or not auth_token:
        raise HTTPException(status_code=400, detail="Twilio credentials not configured")

    try:
        # Build the content type structure based on template type
        types = {}

        if template.template_type == "twilio/text":
            types["twilio/text"] = {
                "body": template.body
            }
        elif template.template_type == "twilio/media":
            types["twilio/media"] = {
                "body": template.body
            }
        elif template.template_type == "twilio/call-to-action":
            actions = []
            if template.button_text and template.button_url:
                actions.append({
                    "type": "URL",
                    "title": template.button_text,
                    "url": template.button_url
                })
            types["twilio/call-to-action"] = {
                "body": template.body,
                "actions": actions
            }
        else:
            # Default to text
            types["twilio/text"] = {
                "body": template.body
            }

        # Extract variables from body (format: {{1}}, {{2}}, etc.)
        import re
        var_pattern = re.compile(r'\{\{(\d+)\}\}')
        var_matches = var_pattern.findall(template.body)

        variables = {}
        for var_num in sorted(set(var_matches)):
            # Use provided sample value or default placeholder
            if template.variable_samples and var_num in template.variable_samples:
                variables[var_num] = template.variable_samples[var_num]
            else:
                variables[var_num] = f"sample_value_{var_num}"

        # Create content payload
        payload = {
            "friendly_name": template.friendly_name,
            "language": template.language,
            "types": types
        }

        if variables:
            payload["variables"] = variables

        # Create content via Twilio API
        url = "https://content.twilio.com/v1/Content"
        response = requests.post(
            url,
            json=payload,
            auth=(account_sid, auth_token)
        )

        if response.status_code not in [200, 201]:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get("message", response.text)
            except:
                pass
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to create template: {error_detail}"
            )

        content_data = response.json()
        content_sid = content_data.get("sid")

        # Now submit for WhatsApp approval
        approval_url = f"https://content.twilio.com/v1/Content/{content_sid}/ApprovalRequests/whatsapp"
        approval_payload = {
            "name": template.friendly_name,
            "category": template.category
        }

        approval_response = requests.post(
            approval_url,
            json=approval_payload,
            auth=(account_sid, auth_token)
        )

        approval_status = "not_submitted"
        if approval_response.status_code in [200, 201]:
            approval_data = approval_response.json()
            approval_status = approval_data.get("status", "pending")
        else:
            # Template created but approval submission failed
            approval_status = f"approval_failed: {approval_response.text}"

        return {
            "success": True,
            "template_sid": content_sid,
            "friendly_name": template.friendly_name,
            "approval_status": approval_status,
            "message": "Template created and submitted for WhatsApp approval"
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.delete("/templates/{template_sid}")
def delete_template(
    template_sid: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a content template"""
    account_sid, auth_token = get_user_twilio_credentials(current_user, db)

    if not account_sid or not auth_token:
        raise HTTPException(status_code=400, detail="Twilio credentials not configured")

    try:
        url = f"https://content.twilio.com/v1/Content/{template_sid}"
        response = requests.delete(
            url,
            auth=(account_sid, auth_token)
        )

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Template not found")

        if response.status_code not in [200, 204]:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to delete template: {response.text}"
            )

        return {"success": True, "message": "Template deleted successfully"}

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")
