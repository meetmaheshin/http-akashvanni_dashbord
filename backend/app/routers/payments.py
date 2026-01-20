from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import razorpay
import hmac
import hashlib
import httpx
import os
import json
from datetime import datetime
from typing import List
from io import BytesIO
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..config import settings

router = APIRouter(prefix="/payments", tags=["Payments"])

# External database webhook URL - set this in Railway environment variables
EXTERNAL_DB_WEBHOOK_URL = os.getenv("EXTERNAL_DB_WEBHOOK_URL")
EXTERNAL_DB_API_KEY = os.getenv("EXTERNAL_DB_API_KEY")  # Optional API key for authentication


async def forward_payment_to_external_db(payment_data: dict):
    """
    Forward payment data to external database via webhook/API.
    This runs asynchronously and won't block the main payment flow.
    """
    if not EXTERNAL_DB_WEBHOOK_URL:
        return  # No external DB configured, skip

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {"Content-Type": "application/json"}
            if EXTERNAL_DB_API_KEY:
                headers["Authorization"] = f"Bearer {EXTERNAL_DB_API_KEY}"

            response = await client.post(
                EXTERNAL_DB_WEBHOOK_URL,
                json=payment_data,
                headers=headers
            )
            response.raise_for_status()
            print(f"Payment data forwarded to external DB: {payment_data.get('razorpay_payment_id')}")
    except Exception as e:
        # Log error but don't fail the main payment
        print(f"Failed to forward payment to external DB: {str(e)}")

# GST rate
GST_RATE = 0.18  # 18%

def get_razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Razorpay not configured"
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def generate_invoice_number(db: Session) -> str:
    """Generate unique invoice number like TZ-2024-0001"""
    year = datetime.now().year

    # Get company config for prefix
    company = db.query(models.CompanyConfig).first()
    prefix = company.invoice_prefix if company else "TZ"

    # Count existing invoices this year
    count = db.query(models.Invoice).filter(
        models.Invoice.invoice_number.like(f"{prefix}-{year}-%")
    ).count()

    return f"{prefix}-{year}-{str(count + 1).zfill(4)}"

def calculate_gst(total_amount_paise: int):
    """
    Calculate GST breakdown from total amount
    If customer pays ₹1000, GST is included, so:
    - Subtotal = 1000 / 1.18 = 847.46
    - GST = 152.54 (18%)
    - Credited to wallet = 847.46
    """
    subtotal = int(total_amount_paise / (1 + GST_RATE))
    gst_amount = total_amount_paise - subtotal
    # Split GST into CGST and SGST (9% each) for intra-state
    cgst = gst_amount // 2
    sgst = gst_amount - cgst

    return {
        "subtotal": subtotal,
        "cgst": cgst,
        "sgst": sgst,
        "igst": 0,  # For inter-state, we'd use IGST instead
        "total": total_amount_paise,
        "credited": subtotal  # Amount added to wallet
    }

@router.get("/check-gst", response_model=schemas.GSTCheckResponse)
def check_gst_status(
    current_user: models.User = Depends(get_current_user)
):
    """Check if user has GST details and if prompt was shown"""
    return schemas.GSTCheckResponse(
        has_gst=bool(current_user.gst_number),
        gst_prompt_shown=current_user.gst_prompt_shown or False,
        gst_number=current_user.gst_number
    )

@router.post("/mark-gst-prompt-shown")
def mark_gst_prompt_shown(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark that GST prompt was shown to user"""
    current_user.gst_prompt_shown = True
    db.commit()
    return {"status": "ok"}

@router.post("/create-order", response_model=schemas.RazorpayOrderResponse)
def create_order(
    order_data: schemas.RazorpayOrderCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client = get_razorpay_client()

    # Convert rupees to paise
    amount_paise = order_data.amount * 100

    if amount_paise < 100:  # Minimum ₹1
        raise HTTPException(
            status_code=400,
            detail="Minimum amount is ₹1"
        )

    # Calculate GST
    gst_calc = calculate_gst(amount_paise)

    # Create Razorpay order
    try:
        razorpay_order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"user_{current_user.id}_{int(datetime.now().timestamp())}",
            "notes": {
                "user_id": str(current_user.id),
                "user_email": current_user.email,
                "subtotal": str(gst_calc["subtotal"]),
                "gst": str(gst_calc["cgst"] + gst_calc["sgst"])
            }
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create order: {str(e)}"
        )

    # Create pending transaction
    transaction = models.Transaction(
        user_id=current_user.id,
        amount=amount_paise,
        type="credit",
        status="pending",
        razorpay_order_id=razorpay_order["id"],
        description=f"Wallet recharge of ₹{order_data.amount} (₹{gst_calc['credited']/100:.2f} + GST)"
    )
    db.add(transaction)
    db.commit()

    return schemas.RazorpayOrderResponse(
        order_id=razorpay_order["id"],
        amount=amount_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID
    )

@router.post("/verify-payment")
async def verify_payment(
    payment_data: schemas.RazorpayPaymentVerify,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the transaction
    transaction = db.query(models.Transaction).filter(
        models.Transaction.razorpay_order_id == payment_data.razorpay_order_id,
        models.Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction.status == "completed":
        return {"status": "already_verified", "balance": current_user.balance}

    # Verify signature
    try:
        message = f"{payment_data.razorpay_order_id}|{payment_data.razorpay_payment_id}"
        expected_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if expected_signature != payment_data.razorpay_signature:
            transaction.status = "failed"
            db.commit()
            raise HTTPException(status_code=400, detail="Invalid signature")
    except HTTPException:
        raise
    except Exception as e:
        transaction.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")

    # Calculate GST
    gst_calc = calculate_gst(transaction.amount)

    # Generate invoice
    invoice_number = generate_invoice_number(db)

    # Build customer address
    customer_address = None
    if current_user.billing_address:
        parts = [current_user.billing_address]
        if current_user.city:
            parts.append(current_user.city)
        if current_user.state:
            parts.append(current_user.state)
        if current_user.pincode:
            parts.append(current_user.pincode)
        customer_address = ", ".join(parts)

    invoice = models.Invoice(
        user_id=current_user.id,
        invoice_number=invoice_number,
        customer_name=current_user.name,
        customer_email=current_user.email,
        customer_company=current_user.company_name,
        customer_gst=current_user.gst_number,
        customer_address=customer_address,
        subtotal=gst_calc["subtotal"],
        cgst_amount=gst_calc["cgst"],
        sgst_amount=gst_calc["sgst"],
        igst_amount=gst_calc["igst"],
        total_amount=gst_calc["total"],
        credited_amount=gst_calc["credited"],
        razorpay_payment_id=payment_data.razorpay_payment_id,
        payment_date=datetime.utcnow(),
        status="paid"
    )
    db.add(invoice)
    db.flush()  # Get invoice ID

    # Update transaction
    transaction.razorpay_payment_id = payment_data.razorpay_payment_id
    transaction.razorpay_signature = payment_data.razorpay_signature
    transaction.status = "completed"
    transaction.invoice_id = invoice.id
    transaction.amount = gst_calc["credited"]  # Update to credited amount
    transaction.description = f"Wallet recharge - Invoice #{invoice_number}"

    # Add credited amount (after GST) to user balance
    current_user.balance += gst_calc["credited"]

    db.commit()
    db.refresh(current_user)

    # Forward payment data to external database (async, won't block response)
    external_payment_data = {
        "event": "payment.verified",
        "timestamp": datetime.utcnow().isoformat(),
        "razorpay_payment_id": payment_data.razorpay_payment_id,
        "razorpay_order_id": payment_data.razorpay_order_id,
        "razorpay_signature": payment_data.razorpay_signature,
        "invoice_number": invoice_number,
        "invoice_id": invoice.id,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "company_name": current_user.company_name,
            "gst_number": current_user.gst_number
        },
        "amount": {
            "total_paise": gst_calc["total"],
            "total_rupees": gst_calc["total"] / 100,
            "subtotal_paise": gst_calc["subtotal"],
            "subtotal_rupees": gst_calc["subtotal"] / 100,
            "gst_paise": gst_calc["cgst"] + gst_calc["sgst"],
            "gst_rupees": (gst_calc["cgst"] + gst_calc["sgst"]) / 100,
            "cgst_paise": gst_calc["cgst"],
            "sgst_paise": gst_calc["sgst"],
            "credited_paise": gst_calc["credited"],
            "credited_rupees": gst_calc["credited"] / 100
        },
        "new_balance_paise": current_user.balance,
        "new_balance_rupees": current_user.balance / 100
    }

    # Fire and forget - don't wait for external DB
    import asyncio
    asyncio.create_task(forward_payment_to_external_db(external_payment_data))

    return {
        "status": "success",
        "message": f"₹{gst_calc['credited'] / 100:.2f} added to wallet (₹{gst_calc['total'] / 100:.2f} paid, ₹{(gst_calc['cgst'] + gst_calc['sgst']) / 100:.2f} GST)",
        "invoice_number": invoice_number,
        "invoice_id": invoice.id,
        "balance_paise": current_user.balance,
        "balance_rupees": current_user.balance / 100,
        "paid_amount": gst_calc["total"] / 100,
        "gst_amount": (gst_calc["cgst"] + gst_calc["sgst"]) / 100,
        "credited_amount": gst_calc["credited"] / 100
    }

@router.get("/invoices", response_model=List[schemas.InvoiceResponse])
def get_invoices(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all invoices for current user"""
    invoices = db.query(models.Invoice).filter(
        models.Invoice.user_id == current_user.id
    ).order_by(models.Invoice.created_at.desc()).all()

    result = []
    for inv in invoices:
        result.append(schemas.InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            customer_name=inv.customer_name,
            customer_email=inv.customer_email,
            customer_company=inv.customer_company,
            customer_gst=inv.customer_gst,
            customer_address=inv.customer_address,
            subtotal=inv.subtotal,
            cgst_amount=inv.cgst_amount,
            sgst_amount=inv.sgst_amount,
            igst_amount=inv.igst_amount,
            total_amount=inv.total_amount,
            credited_amount=inv.credited_amount,
            subtotal_rupees=inv.subtotal / 100,
            cgst_rupees=inv.cgst_amount / 100,
            sgst_rupees=inv.sgst_amount / 100,
            igst_rupees=inv.igst_amount / 100,
            total_rupees=inv.total_amount / 100,
            credited_rupees=inv.credited_amount / 100,
            razorpay_payment_id=inv.razorpay_payment_id,
            payment_date=inv.payment_date,
            status=inv.status,
            created_at=inv.created_at
        ))

    return result

@router.get("/invoices/{invoice_id}", response_model=schemas.InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific invoice"""
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return schemas.InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        customer_name=invoice.customer_name,
        customer_email=invoice.customer_email,
        customer_company=invoice.customer_company,
        customer_gst=invoice.customer_gst,
        customer_address=invoice.customer_address,
        subtotal=invoice.subtotal,
        cgst_amount=invoice.cgst_amount,
        sgst_amount=invoice.sgst_amount,
        igst_amount=invoice.igst_amount,
        total_amount=invoice.total_amount,
        credited_amount=invoice.credited_amount,
        subtotal_rupees=invoice.subtotal / 100,
        cgst_rupees=invoice.cgst_amount / 100,
        sgst_rupees=invoice.sgst_amount / 100,
        igst_rupees=invoice.igst_amount / 100,
        total_rupees=invoice.total_amount / 100,
        credited_rupees=invoice.credited_amount / 100,
        razorpay_payment_id=invoice.razorpay_payment_id,
        payment_date=invoice.payment_date,
        status=invoice.status,
        created_at=invoice.created_at
    )

@router.get("/invoices/{invoice_id}/download")
def download_invoice(
    invoice_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download invoice as HTML (can be printed as PDF)"""
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Get company details
    company = db.query(models.CompanyConfig).first()

    if not company:
        company_name = "TWOZERO"
        company_legal = "MAHESH"
        company_gst = "07ATPPM6940D1ZG"
        company_address = "First Floor, A-784, G. D. Colony, Mayur Vihar, Phase - 3, East Delhi, Delhi, 110096"
    else:
        company_name = company.company_name
        company_legal = company.legal_name
        company_gst = company.gst_number
        company_address = company.address

    # Generate HTML invoice
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice {invoice.invoice_number}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
            .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }}
            .company-name {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
            .invoice-title {{ font-size: 28px; color: #666; }}
            .invoice-number {{ font-size: 14px; color: #666; }}
            .section {{ margin-bottom: 30px; }}
            .section-title {{ font-weight: bold; color: #2563eb; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }}
            .details-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
            .detail-item {{ margin-bottom: 8px; }}
            .detail-label {{ color: #666; font-size: 12px; }}
            .detail-value {{ font-weight: 500; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background: #f8f9fa; font-weight: 600; }}
            .amount-row {{ font-weight: bold; }}
            .total-row {{ background: #2563eb; color: white; }}
            .total-row td {{ border: none; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
            .text-right {{ text-align: right; }}
            @media print {{
                body {{ margin: 20px; }}
                .no-print {{ display: none; }}
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="company-name">{company_name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">{company_legal}</div>
                <div style="font-size: 12px; color: #666;">GSTIN: {company_gst}</div>
                <div style="font-size: 11px; color: #888; max-width: 300px; margin-top: 5px;">{company_address}</div>
            </div>
            <div class="text-right">
                <div class="invoice-title">TAX INVOICE</div>
                <div class="invoice-number">#{invoice.invoice_number}</div>
                <div style="font-size: 12px; color: #666; margin-top: 10px;">
                    Date: {invoice.payment_date.strftime('%d %b %Y') if invoice.payment_date else invoice.created_at.strftime('%d %b %Y')}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Bill To</div>
            <div class="details-grid">
                <div>
                    <div class="detail-item">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">{invoice.customer_company or invoice.customer_name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">{invoice.customer_email}</div>
                    </div>
                </div>
                <div>
                    {f'<div class="detail-item"><div class="detail-label">GSTIN</div><div class="detail-value">{invoice.customer_gst}</div></div>' if invoice.customer_gst else ''}
                    {f'<div class="detail-item"><div class="detail-label">Address</div><div class="detail-value">{invoice.customer_address}</div></div>' if invoice.customer_address else ''}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Invoice Details</div>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>SAC Code</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>WhatsApp Messaging Service - Wallet Recharge</td>
                        <td>998319</td>
                        <td class="text-right">₹{invoice.subtotal / 100:.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="2">CGST @ 9%</td>
                        <td class="text-right">₹{invoice.cgst_amount / 100:.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="2">SGST @ 9%</td>
                        <td class="text-right">₹{invoice.sgst_amount / 100:.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="2"><strong>Total Amount</strong></td>
                        <td class="text-right"><strong>₹{invoice.total_amount / 100:.2f}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Payment Details</div>
            <div class="details-grid">
                <div>
                    <div class="detail-item">
                        <div class="detail-label">Payment Method</div>
                        <div class="detail-value">Online (Razorpay)</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Payment ID</div>
                        <div class="detail-value">{invoice.razorpay_payment_id or 'N/A'}</div>
                    </div>
                </div>
                <div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value" style="color: #16a34a; font-weight: bold;">PAID</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Wallet Credit</div>
                        <div class="detail-value">₹{invoice.credited_amount / 100:.2f}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>For any queries, please contact us at support@twozero.in</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
                Print / Save as PDF
            </button>
        </div>
    </body>
    </html>
    """

    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)

# Webhook for Razorpay (optional, for reliability)
@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    try:
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        if expected != signature:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except:
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    data = await request.json()
    event = data.get("event")

    # Forward raw Razorpay webhook data to external DB
    import asyncio
    webhook_data = {
        "event": event,
        "source": "razorpay_webhook",
        "timestamp": datetime.utcnow().isoformat(),
        "raw_payload": data
    }
    asyncio.create_task(forward_payment_to_external_db(webhook_data))

    if event == "payment.captured":
        payment = data["payload"]["payment"]["entity"]
        order_id = payment.get("order_id")

        if order_id:
            transaction = db.query(models.Transaction).filter(
                models.Transaction.razorpay_order_id == order_id
            ).first()

            if transaction and transaction.status == "pending":
                # Calculate GST
                gst_calc = calculate_gst(transaction.amount)

                transaction.razorpay_payment_id = payment["id"]
                transaction.status = "completed"
                transaction.amount = gst_calc["credited"]

                user = db.query(models.User).filter(
                    models.User.id == transaction.user_id
                ).first()

                if user:
                    user.balance += gst_calc["credited"]

                db.commit()

    return {"status": "ok"}
