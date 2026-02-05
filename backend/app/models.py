from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"

class TransactionType(str, enum.Enum):
    CREDIT = "credit"      # Money added (Razorpay payment)
    DEBIT = "debit"        # Money deducted (message sent)

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class MessageType(str, enum.Enum):
    TEMPLATE = "template"
    SESSION = "session"

class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

# User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), index=True)
    name = Column(String(255), nullable=False)
    company_name = Column(String(255))
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.CUSTOMER)

    # GST and Billing details
    gst_number = Column(String(20))
    billing_address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))

    # Flag to track if user was asked about GST
    gst_prompt_shown = Column(Boolean, default=False)

    # Balance in paise (100 paise = ₹1)
    balance = Column(Integer, default=0)

    # WhatsApp Business Integration
    whatsapp_access_token = Column(Text)  # Meta access token
    whatsapp_waba_id = Column(String(100))  # WhatsApp Business Account ID
    whatsapp_phone_number_id = Column(String(100))  # Phone Number ID for API calls
    whatsapp_phone_number = Column(String(20))  # Display phone number
    whatsapp_business_name = Column(String(255))  # Business name from Meta
    whatsapp_display_name = Column(String(255))  # Verified display name
    whatsapp_quality_rating = Column(String(20))  # GREEN, YELLOW, RED
    whatsapp_connected_at = Column(DateTime(timezone=True))

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    transactions = relationship("Transaction", back_populates="user")
    messages = relationship("Message", back_populates="user")
    invoices = relationship("Invoice", back_populates="user")

# Transaction model (for balance history)
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Amount in paise
    amount = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)  # credit/debit
    status = Column(String(20), default=TransactionStatus.PENDING)

    # For Razorpay payments
    razorpay_order_id = Column(String(255))
    razorpay_payment_id = Column(String(255))
    razorpay_signature = Column(String(255))

    # Description
    description = Column(String(500))

    # For message-related debits
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)

    # Link to invoice
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
    message = relationship("Message", back_populates="transaction")
    invoice = relationship("Invoice", back_populates="transaction")

# Invoice model
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Invoice number (e.g., TZ-2024-0001)
    invoice_number = Column(String(50), unique=True, nullable=False)

    # Customer billing details (snapshot at time of invoice)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_company = Column(String(255))
    customer_gst = Column(String(20))
    customer_address = Column(Text)

    # Amount details (all in paise)
    subtotal = Column(Integer, nullable=False)  # Amount before GST
    cgst_amount = Column(Integer, default=0)    # 9% CGST
    sgst_amount = Column(Integer, default=0)    # 9% SGST
    igst_amount = Column(Integer, default=0)    # 18% IGST (for inter-state)
    total_amount = Column(Integer, nullable=False)  # Total paid by customer
    credited_amount = Column(Integer, nullable=False)  # Amount added to wallet (after GST)

    # Payment details
    razorpay_payment_id = Column(String(255))
    payment_date = Column(DateTime(timezone=True))

    # Invoice status
    status = Column(String(20), default="paid")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="invoices")
    transaction = relationship("Transaction", back_populates="invoice", uselist=False)

# Message model (WhatsApp messages)
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Recipient details
    recipient_phone = Column(String(20), nullable=False)
    recipient_name = Column(String(255))

    # Message details
    message_type = Column(String(20), nullable=False)  # template/session
    template_name = Column(String(255))  # For template messages
    message_content = Column(Text)
    direction = Column(String(20), default='outbound')  # outbound/inbound

    # Status tracking
    status = Column(String(20), default=MessageStatus.PENDING)

    # WhatsApp API response
    whatsapp_message_id = Column(String(255))
    error_message = Column(Text)

    # Cost in paise
    cost = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    read_at = Column(DateTime(timezone=True))

    # Relationships
    user = relationship("User", back_populates="messages")
    transaction = relationship("Transaction", back_populates="message", uselist=False)

# Pricing configuration (admin can update)
class PricingConfig(Base):
    __tablename__ = "pricing_config"

    id = Column(Integer, primary_key=True, index=True)
    message_type = Column(String(20), unique=True, nullable=False)
    price = Column(Integer, nullable=False)  # in paise
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# API Configuration (for WhatsApp, etc.)
class APIConfig(Base):
    __tablename__ = "api_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "whatsapp", "razorpay"
    api_key = Column(String(500))
    api_secret = Column(String(500))
    api_url = Column(String(500))
    extra_config = Column(Text)  # JSON string for additional config
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Company Config (Your company details for invoices)
class CompanyConfig(Base):
    __tablename__ = "company_config"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    legal_name = Column(String(255), nullable=False)
    gst_number = Column(String(20), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))
    email = Column(String(255))
    phone = Column(String(20))
    bank_name = Column(String(255))
    bank_account = Column(String(50))
    bank_ifsc = Column(String(20))
    invoice_prefix = Column(String(10), default="TZ")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Phone Number to Customer Mapping (for Twilio sync)
class PhoneMapping(Base):
    __tablename__ = "phone_mappings"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)  # e.g., +916355060488
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Per-customer Twilio credentials (for subaccounts)
    twilio_account_sid = Column(String(100))  # Customer's Twilio Account SID
    twilio_auth_token = Column(String(100))   # Customer's Twilio Auth Token

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User")


# Payment Log - stores all raw payment data from Razorpay
class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Razorpay identifiers
    razorpay_payment_id = Column(String(100), unique=True, index=True)
    razorpay_order_id = Column(String(100), index=True)
    razorpay_signature = Column(String(255))

    # Event info
    event_type = Column(String(50))  # payment.verified, payment.captured, etc.
    source = Column(String(50))  # verify_payment, webhook

    # User info
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255))
    user_name = Column(String(255))
    user_phone = Column(String(50))
    company_name = Column(String(255))
    gst_number = Column(String(50))

    # Amount details (all in paise)
    total_amount = Column(Integer)
    subtotal_amount = Column(Integer)
    gst_amount = Column(Integer)
    cgst_amount = Column(Integer)
    sgst_amount = Column(Integer)
    credited_amount = Column(Integer)

    # Invoice info
    invoice_number = Column(String(50))
    invoice_id = Column(Integer)

    # Balance after payment
    new_balance = Column(Integer)

    # Raw JSON data (stores complete Razorpay response)
    raw_data = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User")


# Public Customer Mapping (for portal recharge without login)
class PublicCustomer(Base):
    __tablename__ = "public_customers"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)  # Phone number for lookup
    name = Column(String(255), nullable=False)  # Customer name to display
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Mapped user (optional)
    notes = Column(Text)  # Admin notes
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    user = relationship("User")


# Public Payment Log (for payments made via portal)
class PublicPayment(Base):
    __tablename__ = "public_payments"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), index=True, nullable=False)
    customer_name = Column(String(255))
    public_customer_id = Column(Integer, ForeignKey("public_customers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # If mapped

    # Payment details
    amount = Column(Integer, nullable=False)  # Amount in paise
    razorpay_order_id = Column(String(255))
    razorpay_payment_id = Column(String(255))
    razorpay_signature = Column(String(255))
    status = Column(String(20), default="pending")  # pending, completed, failed

    # GST breakdown
    subtotal = Column(Integer)
    gst_amount = Column(Integer)
    credited_amount = Column(Integer)

    # Admin processing
    processed = Column(Boolean, default=False)  # Has admin credited the user?
    processed_at = Column(DateTime(timezone=True))
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    public_customer = relationship("PublicCustomer")
    user = relationship("User", foreign_keys=[user_id])
