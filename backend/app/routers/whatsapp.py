"""
WhatsApp Business API Integration Router

This module handles:
1. Meta (Facebook) OAuth flow for connecting WhatsApp Business accounts
2. Storing customer's WhatsApp Business credentials
3. Sending messages via Meta Cloud API
4. Managing message templates
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from datetime import datetime

from ..database import get_db
from ..auth import get_current_user
from ..models import User, Message
from ..email_utils import check_and_send_low_balance_alert

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Meta App Configuration (set these in .env)
META_APP_ID = os.getenv("META_APP_ID", "")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")
META_REDIRECT_URI = os.getenv("META_REDIRECT_URI", "https://akashvanni.com/whatsapp-connect")
META_CONFIG_ID = os.getenv("META_CONFIG_ID", "")  # WhatsApp Embedded Signup Config ID

# Meta API URLs
META_OAUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
META_GRAPH_URL = "https://graph.facebook.com/v18.0"


# Pydantic Models
class OAuthCallback(BaseModel):
    code: str


class SendMessageRequest(BaseModel):
    to: str  # Phone number with country code (e.g., "919876543210")
    template_name: str
    template_language: str = "en"
    template_params: Optional[list] = None


class ConnectionStatus(BaseModel):
    connected: bool
    phone_number: Optional[str] = None
    phone_number_id: Optional[str] = None
    waba_id: Optional[str] = None
    business_name: Optional[str] = None
    display_name: Optional[str] = None
    quality_rating: Optional[str] = None


# ============ OAuth Flow ============

@router.get("/oauth-url")
def get_oauth_url(current_user: User = Depends(get_current_user)):
    """
    Generate the Facebook OAuth URL for WhatsApp Business connection.
    Uses Meta's Embedded Signup flow for easier onboarding.
    """
    if not META_APP_ID:
        raise HTTPException(
            status_code=500,
            detail="WhatsApp integration not configured. Please contact support."
        )

    # State parameter to prevent CSRF (includes user ID)
    state = f"user_{current_user.id}"

    # Required scopes for WhatsApp Business API
    scopes = [
        "whatsapp_business_management",
        "whatsapp_business_messaging",
        "business_management"
    ]

    # Build OAuth URL
    # Using Embedded Signup for easier flow
    oauth_url = (
        f"{META_OAUTH_URL}"
        f"?client_id={META_APP_ID}"
        f"&redirect_uri={META_REDIRECT_URI}"
        f"&state={state}"
        f"&scope={','.join(scopes)}"
        f"&response_type=code"
    )

    # If using Embedded Signup, add config_id
    if META_CONFIG_ID:
        oauth_url += f"&config_id={META_CONFIG_ID}"

    return {"oauth_url": oauth_url}


@router.post("/connect")
async def connect_whatsapp(
    callback: OAuthCallback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle the OAuth callback from Facebook.
    Exchange the code for an access token and retrieve WhatsApp Business details.
    """
    if not META_APP_ID or not META_APP_SECRET:
        raise HTTPException(
            status_code=500,
            detail="WhatsApp integration not configured"
        )

    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_response = await client.get(
                META_TOKEN_URL,
                params={
                    "client_id": META_APP_ID,
                    "client_secret": META_APP_SECRET,
                    "redirect_uri": META_REDIRECT_URI,
                    "code": callback.code,
                }
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to exchange code for token"
                )

            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                raise HTTPException(
                    status_code=400,
                    detail="No access token received"
                )

            # Get WhatsApp Business Account ID
            # First, get the user's businesses
            debug_response = await client.get(
                f"{META_GRAPH_URL}/debug_token",
                params={
                    "input_token": access_token,
                    "access_token": f"{META_APP_ID}|{META_APP_SECRET}"
                }
            )

            # Get shared WhatsApp Business Accounts
            waba_response = await client.get(
                f"{META_GRAPH_URL}/me/businesses",
                params={"access_token": access_token}
            )

            businesses = waba_response.json().get("data", [])

            # Find WhatsApp Business Account
            waba_id = None
            phone_number_id = None
            phone_number = None
            display_name = None
            business_name = None

            for business in businesses:
                business_id = business.get("id")

                # Get WhatsApp Business Accounts for this business
                waba_list_response = await client.get(
                    f"{META_GRAPH_URL}/{business_id}/owned_whatsapp_business_accounts",
                    params={"access_token": access_token}
                )

                waba_list = waba_list_response.json().get("data", [])

                if waba_list:
                    waba_id = waba_list[0].get("id")
                    business_name = business.get("name")

                    # Get phone numbers for this WABA
                    phones_response = await client.get(
                        f"{META_GRAPH_URL}/{waba_id}/phone_numbers",
                        params={"access_token": access_token}
                    )

                    phones = phones_response.json().get("data", [])

                    if phones:
                        phone_number_id = phones[0].get("id")
                        phone_number = phones[0].get("display_phone_number")
                        display_name = phones[0].get("verified_name")

                    break

            if not waba_id:
                raise HTTPException(
                    status_code=400,
                    detail="No WhatsApp Business Account found. Please complete the WhatsApp Business setup first."
                )

            # Store credentials in user record
            current_user.whatsapp_access_token = access_token
            current_user.whatsapp_waba_id = waba_id
            current_user.whatsapp_phone_number_id = phone_number_id
            current_user.whatsapp_phone_number = phone_number
            current_user.whatsapp_business_name = business_name
            current_user.whatsapp_display_name = display_name
            current_user.whatsapp_connected_at = datetime.utcnow()

            db.commit()

            return ConnectionStatus(
                connected=True,
                phone_number=phone_number,
                phone_number_id=phone_number_id,
                waba_id=waba_id,
                business_name=business_name,
                display_name=display_name,
                quality_rating="GREEN"  # Will be updated from webhooks
            )

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Meta API: {str(e)}"
        )


@router.get("/connection-status")
def get_connection_status(
    current_user: User = Depends(get_current_user)
) -> ConnectionStatus:
    """
    Get the current WhatsApp connection status for the user.
    """
    if not current_user.whatsapp_waba_id:
        return ConnectionStatus(connected=False)

    return ConnectionStatus(
        connected=True,
        phone_number=current_user.whatsapp_phone_number,
        phone_number_id=current_user.whatsapp_phone_number_id,
        waba_id=current_user.whatsapp_waba_id,
        business_name=current_user.whatsapp_business_name,
        display_name=current_user.whatsapp_display_name,
        quality_rating=current_user.whatsapp_quality_rating or "GREEN"
    )


@router.post("/disconnect")
def disconnect_whatsapp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect the WhatsApp Business account.
    This removes stored credentials but doesn't revoke Meta access.
    """
    current_user.whatsapp_access_token = None
    current_user.whatsapp_waba_id = None
    current_user.whatsapp_phone_number_id = None
    current_user.whatsapp_phone_number = None
    current_user.whatsapp_business_name = None
    current_user.whatsapp_display_name = None
    current_user.whatsapp_connected_at = None

    db.commit()

    return {"status": "disconnected"}


@router.post("/test-connection")
async def test_connection(
    current_user: User = Depends(get_current_user)
):
    """
    Test the WhatsApp connection by verifying the access token.
    """
    if not current_user.whatsapp_access_token:
        return {"success": False, "error": "Not connected"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{META_GRAPH_URL}/{current_user.whatsapp_phone_number_id}",
                params={"access_token": current_user.whatsapp_access_token}
            )

            if response.status_code == 200:
                return {"success": True}
            else:
                return {"success": False, "error": "Token may be expired"}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ============ Messaging ============

@router.post("/send-message")
async def send_message(
    request: SendMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a WhatsApp message using a template.

    This uses Meta's Cloud API to send template messages.
    Templates must be pre-approved in the Meta Business Suite.
    """
    if not current_user.whatsapp_access_token:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp not connected. Please connect your WhatsApp Business first."
        )

    # Check user balance
    message_cost = get_message_cost(db)  # Get from pricing config

    if current_user.balance < message_cost:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance. Please add money to your wallet."
        )

    try:
        async with httpx.AsyncClient() as client:
            # Prepare message payload
            payload = {
                "messaging_product": "whatsapp",
                "to": request.to,
                "type": "template",
                "template": {
                    "name": request.template_name,
                    "language": {
                        "code": request.template_language
                    }
                }
            }

            # Add template parameters if provided
            if request.template_params:
                payload["template"]["components"] = [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": param}
                            for param in request.template_params
                        ]
                    }
                ]

            # Send message via Meta Cloud API
            response = await client.post(
                f"{META_GRAPH_URL}/{current_user.whatsapp_phone_number_id}/messages",
                headers={
                    "Authorization": f"Bearer {current_user.whatsapp_access_token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )

            response_data = response.json()

            if response.status_code != 200:
                error_msg = response_data.get("error", {}).get("message", "Unknown error")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to send message: {error_msg}"
                )

            # Get message ID from response
            whatsapp_message_id = response_data.get("messages", [{}])[0].get("id")

            # Deduct balance
            current_user.balance -= message_cost

            # Create message record
            message = Message(
                user_id=current_user.id,
                recipient_phone=request.to,
                message_type="template",
                template_name=request.template_name,
                status="sent",
                whatsapp_message_id=whatsapp_message_id,
                cost=message_cost,
                sent_at=datetime.utcnow()
            )
            db.add(message)
            db.commit()

            # Check for low balance and send alert in background
            background_tasks.add_task(check_and_send_low_balance_alert, current_user)

            return {
                "success": True,
                "message_id": message.id,
                "whatsapp_message_id": whatsapp_message_id,
                "cost": message_cost / 100,
                "remaining_balance": current_user.balance / 100
            }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to WhatsApp API: {str(e)}"
        )


@router.post("/send-bulk")
async def send_bulk_messages(
    recipients: list[str],
    template_name: str,
    template_language: str = "en",
    template_params: Optional[list] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send bulk WhatsApp messages to multiple recipients.
    """
    if not current_user.whatsapp_access_token:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp not connected"
        )

    message_cost = get_message_cost(db)
    total_cost = message_cost * len(recipients)

    if current_user.balance < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need ₹{total_cost/100:.2f} for {len(recipients)} messages."
        )

    results = []
    successful = 0
    failed = 0

    for phone in recipients:
        try:
            # Send each message
            request = SendMessageRequest(
                to=phone,
                template_name=template_name,
                template_language=template_language,
                template_params=template_params
            )
            result = await send_message(request, current_user, db)
            results.append({"phone": phone, "status": "sent", "message_id": result["message_id"]})
            successful += 1
        except Exception as e:
            results.append({"phone": phone, "status": "failed", "error": str(e)})
            failed += 1

    return {
        "total": len(recipients),
        "successful": successful,
        "failed": failed,
        "results": results
    }


# ============ Helper Functions ============

def get_message_cost(db: Session) -> int:
    """Get the current message cost from pricing config (in paise)."""
    from ..models import PricingConfig

    config = db.query(PricingConfig).filter(
        PricingConfig.message_type == "template"
    ).first()

    return config.price if config else 200  # Default 200 paise (₹2)


# ============ Webhooks ============

@router.post("/webhook")
async def webhook_handler(request: Request, db: Session = Depends(get_db)):
    """
    Handle incoming webhooks from Meta.
    This receives message status updates, delivery receipts, etc.
    """
    body = await request.json()

    # Verify webhook (Meta sends a verification request)
    if request.method == "GET":
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        verify_token = os.getenv("META_WEBHOOK_VERIFY_TOKEN", "")

        if mode == "subscribe" and token == verify_token:
            return int(challenge)
        else:
            raise HTTPException(status_code=403, detail="Verification failed")

    # Process webhook payload
    try:
        entry = body.get("entry", [])

        for e in entry:
            changes = e.get("changes", [])

            for change in changes:
                value = change.get("value", {})

                # Handle status updates
                statuses = value.get("statuses", [])
                for status in statuses:
                    message_id = status.get("id")
                    status_value = status.get("status")  # sent, delivered, read, failed

                    # Update message status in database
                    message = db.query(Message).filter(
                        Message.whatsapp_message_id == message_id
                    ).first()

                    if message:
                        message.status = status_value

                        if status_value == "delivered":
                            message.delivered_at = datetime.utcnow()
                        elif status_value == "read":
                            message.read_at = datetime.utcnow()

                        db.commit()

        return {"status": "ok"}

    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/webhook")
async def webhook_verify(request: Request):
    """
    Handle Meta webhook verification.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    verify_token = os.getenv("META_WEBHOOK_VERIFY_TOKEN", "")

    if mode == "subscribe" and token == verify_token:
        return int(challenge)
    else:
        raise HTTPException(status_code=403, detail="Verification failed")
