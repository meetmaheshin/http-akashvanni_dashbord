from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"

class TransactionType(str, Enum):
    CREDIT = "credit"
    DEBIT = "debit"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class MessageType(str, Enum):
    TEMPLATE = "template"
    SESSION = "session"

class MessageStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    company_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    gst_number: Optional[str] = None
    billing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: str
    balance: int  # in paise
    is_active: bool
    created_at: datetime
    gst_number: Optional[str] = None
    billing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_prompt_shown: bool = False

    class Config:
        from_attributes = True

class UserWithBalance(UserResponse):
    balance_rupees: float  # Computed field

    @classmethod
    def from_user(cls, user):
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            phone=user.phone,
            company_name=user.company_name,
            role=user.role,
            balance=user.balance,
            balance_rupees=user.balance / 100,
            is_active=user.is_active,
            created_at=user.created_at,
            gst_number=user.gst_number,
            billing_address=user.billing_address,
            city=user.city,
            state=user.state,
            pincode=user.pincode,
            gst_prompt_shown=user.gst_prompt_shown
        )

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Transaction schemas
class TransactionBase(BaseModel):
    amount: int  # in paise
    type: TransactionType
    description: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    status: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    amount_rupees: Optional[float] = None
    invoice_id: Optional[int] = None

    class Config:
        from_attributes = True

# Message schemas
class MessageBase(BaseModel):
    recipient_phone: str
    recipient_name: Optional[str] = None
    message_type: MessageType
    template_name: Optional[str] = None
    message_content: Optional[str] = None

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    user_id: int
    status: str
    direction: Optional[str] = 'outbound'
    whatsapp_message_id: Optional[str] = None
    cost: int
    cost_rupees: Optional[float] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

# Razorpay schemas
class RazorpayOrderCreate(BaseModel):
    amount: int  # in rupees (will be converted to paise)

class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str
    key_id: str

class RazorpayPaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# Invoice schemas
class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    customer_name: str
    customer_email: str
    customer_company: Optional[str] = None
    customer_gst: Optional[str] = None
    customer_address: Optional[str] = None
    subtotal: int
    cgst_amount: int
    sgst_amount: int
    igst_amount: int
    total_amount: int
    credited_amount: int
    subtotal_rupees: Optional[float] = None
    cgst_rupees: Optional[float] = None
    sgst_rupees: Optional[float] = None
    igst_rupees: Optional[float] = None
    total_rupees: Optional[float] = None
    credited_rupees: Optional[float] = None
    razorpay_payment_id: Optional[str] = None
    payment_date: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Pricing schemas
class PricingUpdate(BaseModel):
    template_price: int  # in paise
    session_price: int   # in paise

class PricingResponse(BaseModel):
    template_price: int
    session_price: int
    template_price_rupees: float
    session_price_rupees: float

# Dashboard stats
class DashboardStats(BaseModel):
    balance: int
    balance_rupees: float
    total_messages: int
    messages_today: int
    messages_this_month: int
    total_spent: int
    spent_rupees: float

# Admin schemas
class AdminDashboardStats(BaseModel):
    total_customers: int
    active_customers: int
    total_revenue: int
    revenue_rupees: float
    total_messages: int
    messages_today: int

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    balance_adjustment: Optional[int] = None  # in paise, positive to add, negative to deduct
    adjustment_reason: Optional[str] = None

# API Config schemas
class APIConfigCreate(BaseModel):
    name: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    api_url: Optional[str] = None
    extra_config: Optional[str] = None

class APIConfigResponse(BaseModel):
    id: int
    name: str
    api_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Company Config schemas
class CompanyConfigUpdate(BaseModel):
    company_name: Optional[str] = None
    legal_name: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    invoice_prefix: Optional[str] = None

class CompanyConfigResponse(BaseModel):
    id: int
    company_name: str
    legal_name: str
    gst_number: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    invoice_prefix: str

    class Config:
        from_attributes = True

# GST check response
class GSTCheckResponse(BaseModel):
    has_gst: bool
    gst_prompt_shown: bool
    gst_number: Optional[str] = None
