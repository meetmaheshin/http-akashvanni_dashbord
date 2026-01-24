# WhatsApp Dashboard API Documentation

## Base Configuration

### Frontend Configuration
**File:** `frontend/.env`
```
VITE_API_URL=http://localhost:8000    # For local development
VITE_API_URL=https://api.akashvanni.com  # For production
```

### Backend Configuration
**File:** `backend/.env`
```
SECRET_KEY=your-super-secret-key
DATABASE_URL=sqlite:///./whatsapp_dashboard.db  # or PostgreSQL URL
FRONTEND_URL=https://akashvanni.com
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
ADMIN_EMAIL=admin@akashvanni.com
ADMIN_PASSWORD=changeme123
```

---

## API Endpoints

### Base URL
- **Local:** `http://localhost:8000`
- **Production:** `https://api.akashvanni.com`

### Authentication Header
```
Authorization: Bearer <access_token>
```

---

## 1. Authentication (`/auth`)

### POST `/auth/register`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "yourpassword",
  "phone": "+919876543210",      // optional
  "company_name": "Company Ltd"  // optional
}
```

**Response:** `UserResponse`

**Frontend Usage:** `src/pages/Register.jsx`

---

### POST `/auth/login`
Login and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Frontend Usage:** `src/context/AuthContext.jsx` (line ~35)

---

### GET `/auth/me`
Get current user profile.

**Response:** `UserResponse`

**Frontend Usage:** `src/context/AuthContext.jsx`

---

### PUT `/auth/me`
Update current user profile.

**Request Body:**
```json
{
  "name": "New Name",
  "phone": "+919876543210",
  "company_name": "New Company"
}
```

**Response:** `UserResponse`

---

## 2. Customer Endpoints (`/customer`)

### GET `/customer/dashboard`
Get dashboard statistics.

**Response:**
```json
{
  "balance": 10000,           // in paise
  "balance_rupees": 100.0,
  "total_messages": 150,
  "messages_today": 10,
  "messages_this_month": 45,
  "total_spent": 5000,
  "spent_rupees": 50.0
}
```

**Frontend Usage:** `src/pages/customer/Dashboard.jsx` (line ~15)

---

### GET `/customer/transactions`
Get user's transaction history.

**Query Parameters:**
- `skip` (int): Pagination offset (default: 0)
- `limit` (int): Number of records (default: 100)

**Response:** `List[TransactionResponse]`

**Frontend Usage:** `src/pages/customer/Transactions.jsx`

---

### GET `/customer/messages`
Get user's message history.

**Query Parameters:**
- `skip` (int): Pagination offset (default: 0)
- `limit` (int): Number of records (default: 100)

**Response:** `List[MessageResponse]`

**Frontend Usage:** `src/pages/customer/Messages.jsx`

---

### GET `/customer/balance`
Get current wallet balance.

**Response:**
```json
{
  "balance": 10000,
  "balance_rupees": 100.0
}
```

---

### GET `/customer/pricing`
Get current message pricing.

**Response:**
```json
{
  "template_price": 200,
  "session_price": 100,
  "template_price_rupees": 2.0,
  "session_price_rupees": 1.0
}
```

---

### GET `/customer/profile`
Get user profile with GST details.

**Response:** `UserResponse`

**Frontend Usage:** `src/pages/customer/Profile.jsx`

---

### PUT `/customer/profile`
Update user profile including GST.

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+919876543210",
  "company_name": "Company Ltd",
  "gst_number": "07ATPPM6940D1ZG",
  "billing_address": "123 Street",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001"
}
```

**Frontend Usage:** `src/pages/customer/Profile.jsx`

---

## 3. Messages (`/messages`)

### POST `/messages/send`
Send a WhatsApp message (deducts balance).

**Request Body:**
```json
{
  "recipient_phone": "+919876543210",
  "recipient_name": "John",           // optional
  "message_type": "template",         // "template" or "session"
  "template_name": "KYC Reminder",    // required for template
  "message_content": "Hello..."       // optional
}
```

**Response:** `MessageResponse`

**Frontend Usage:** `src/pages/customer/Messages.jsx`

---

### GET `/messages/{message_id}`
Get single message details.

**Response:** `MessageResponse`

---

### POST `/messages/webhook/status`
WhatsApp status webhook (for delivery updates).

---

## 4. Payments (`/payments`)

### GET `/payments/check-gst`
Check if user has GST details.

**Response:**
```json
{
  "has_gst": false,
  "gst_prompt_shown": false,
  "gst_number": null
}
```

**Frontend Usage:** `src/pages/customer/AddMoney.jsx`

---

### POST `/payments/mark-gst-prompt-shown`
Mark GST prompt as shown.

---

### POST `/payments/create-order`
Create Razorpay order for adding money.

**Request Body:**
```json
{
  "amount": 100  // in rupees
}
```

**Response:**
```json
{
  "order_id": "order_xxxxx",
  "amount": 10000,       // in paise
  "currency": "INR",
  "key_id": "rzp_live_xxxxx"
}
```

**Frontend Usage:** `src/pages/customer/AddMoney.jsx`

---

### POST `/payments/verify-payment`
Verify payment after Razorpay checkout.

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "xxxxx"
}
```

**Response:**
```json
{
  "message": "Payment verified",
  "new_balance": 20000,
  "invoice_id": 123
}
```

**Frontend Usage:** `src/pages/customer/AddMoney.jsx`

---

### GET `/payments/invoices`
Get user's invoices.

**Response:** `List[InvoiceResponse]`

**Frontend Usage:** `src/pages/customer/Invoices.jsx`

---

### GET `/payments/invoices/{invoice_id}`
Get single invoice.

**Response:** `InvoiceResponse`

---

### GET `/payments/invoices/{invoice_id}/download`
Download invoice as PDF.

**Response:** PDF file

**Frontend Usage:** `src/pages/customer/Invoices.jsx`

---

### POST `/payments/webhook`
Razorpay webhook for payment events.

---

## 5. Admin Endpoints (`/admin`)

**Note:** All admin endpoints require `role: "admin"`

### GET `/admin/dashboard`
Get admin dashboard statistics.

**Response:**
```json
{
  "total_customers": 50,
  "active_customers": 45,
  "total_revenue": 500000,
  "revenue_rupees": 5000.0,
  "total_messages": 10000,
  "messages_today": 150
}
```

**Frontend Usage:** `src/pages/admin/AdminDashboard.jsx`

---

### GET `/admin/customers`
List all customers.

**Query Parameters:**
- `skip` (int): Pagination offset
- `limit` (int): Number of records
- `search` (str): Search by email/name

**Response:** `List[UserResponse]`

**Frontend Usage:** `src/pages/admin/Customers.jsx`

---

### GET `/admin/customers/{user_id}`
Get single customer details.

**Response:** `UserResponse`

---

### PUT `/admin/customers/{user_id}`
Update customer (balance adjustment, active status).

**Request Body:**
```json
{
  "is_active": true,
  "balance_adjustment": 10000,      // in paise, positive to add
  "adjustment_reason": "Bonus"
}
```

**Frontend Usage:** `src/pages/admin/Customers.jsx`

---

### GET `/admin/customers/{user_id}/transactions`
Get customer's transactions.

**Response:** `List[TransactionResponse]`

---

### GET `/admin/customers/{user_id}/messages`
Get customer's messages.

**Response:** `List[MessageResponse]`

---

### GET `/admin/pricing`
Get current pricing configuration.

**Response:** `PricingResponse`

**Frontend Usage:** `src/pages/admin/Pricing.jsx`

---

### PUT `/admin/pricing`
Update message pricing.

**Request Body:**
```json
{
  "template_price": 200,  // in paise
  "session_price": 100
}
```

**Frontend Usage:** `src/pages/admin/Pricing.jsx`

---

### GET `/admin/api-configs`
List API configurations.

**Response:** `List[APIConfigResponse]`

**Frontend Usage:** `src/pages/admin/Settings.jsx`

---

### POST `/admin/api-configs`
Create new API config.

**Request Body:**
```json
{
  "name": "WhatsApp API",
  "api_key": "xxxxx",
  "api_secret": "xxxxx",
  "api_url": "https://api.whatsapp.com"
}
```

---

### PUT `/admin/api-configs/{config_id}`
Update API config.

---

### DELETE `/admin/api-configs/{config_id}`
Delete API config.

---

### POST `/admin/import-messages/{user_id}`
Import messages from CSV for a user.

**Request:** Multipart form with CSV file

**CSV Format:**
```csv
recipient_phone,recipient_name,message_type,template_name,message_content,status,whatsapp_message_id,cost,sent_at,delivered_at,read_at
+919876543210,John,template,KYC Reminder,Hello...,delivered,MM123,200,2024-01-01,2024-01-01,
```

**Frontend Usage:** `src/pages/admin/ImportMessages.jsx`

---

### GET `/admin/transactions`
List all transactions.

**Query Parameters:**
- `skip`, `limit`, `search`

**Response:** `List[TransactionResponse]`

**Frontend Usage:** `src/pages/admin/AdminTransactions.jsx`

---

### GET `/admin/messages`
List all messages.

**Query Parameters:**
- `skip`, `limit`, `search`

**Response:** `List[MessageResponse]`

**Frontend Usage:** `src/pages/admin/AdminMessages.jsx`

---

## Data Models

### UserResponse
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+919876543210",
  "company_name": "Company Ltd",
  "role": "customer",
  "balance": 10000,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00",
  "gst_number": "07ATPPM6940D1ZG",
  "billing_address": "123 Street",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "gst_prompt_shown": false
}
```

### TransactionResponse
```json
{
  "id": 1,
  "user_id": 3,
  "amount": 10000,
  "type": "credit",
  "description": "Wallet recharge",
  "status": "completed",
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "created_at": "2024-01-01T00:00:00",
  "amount_rupees": 100.0,
  "invoice_id": 1
}
```

### MessageResponse
```json
{
  "id": 1,
  "user_id": 3,
  "recipient_phone": "+919876543210",
  "recipient_name": "John",
  "message_type": "template",
  "template_name": "KYC Reminder",
  "message_content": "Hello...",
  "status": "delivered",
  "whatsapp_message_id": "MM123",
  "cost": 200,
  "cost_rupees": 2.0,
  "created_at": "2024-01-01T00:00:00",
  "sent_at": "2024-01-01T00:00:00",
  "delivered_at": "2024-01-01T00:00:00",
  "read_at": null,
  "error_message": null
}
```

### InvoiceResponse
```json
{
  "id": 1,
  "invoice_number": "TZ-2024-001",
  "customer_name": "John Doe",
  "customer_email": "user@example.com",
  "customer_company": "Company Ltd",
  "customer_gst": "07ATPPM6940D1ZG",
  "customer_address": "123 Street, Delhi",
  "subtotal": 8475,
  "cgst_amount": 763,
  "sgst_amount": 763,
  "igst_amount": 0,
  "total_amount": 10000,
  "credited_amount": 10000,
  "subtotal_rupees": 84.75,
  "cgst_rupees": 7.63,
  "sgst_rupees": 7.63,
  "igst_rupees": 0,
  "total_rupees": 100.0,
  "credited_rupees": 100.0,
  "razorpay_payment_id": "pay_xxx",
  "payment_date": "2024-01-01T00:00:00",
  "status": "paid",
  "created_at": "2024-01-01T00:00:00"
}
```

---

## Frontend Files to Modify

| Feature | Frontend File | Backend Endpoint |
|---------|--------------|------------------|
| Login | `src/context/AuthContext.jsx:35` | POST `/auth/login` |
| Register | `src/pages/Register.jsx` | POST `/auth/register` |
| Dashboard | `src/pages/customer/Dashboard.jsx:15` | GET `/customer/dashboard` |
| Messages | `src/pages/customer/Messages.jsx` | GET `/customer/messages` |
| Transactions | `src/pages/customer/Transactions.jsx` | GET `/customer/transactions` |
| Add Money | `src/pages/customer/AddMoney.jsx` | POST `/payments/create-order` |
| Profile | `src/pages/customer/Profile.jsx` | GET/PUT `/customer/profile` |
| Invoices | `src/pages/customer/Invoices.jsx` | GET `/payments/invoices` |
| Admin Dashboard | `src/pages/admin/AdminDashboard.jsx` | GET `/admin/dashboard` |
| Customers | `src/pages/admin/Customers.jsx` | GET `/admin/customers` |
| Admin Messages | `src/pages/admin/AdminMessages.jsx` | GET `/admin/messages` |
| Admin Transactions | `src/pages/admin/AdminTransactions.jsx` | GET `/admin/transactions` |
| Pricing | `src/pages/admin/Pricing.jsx` | GET/PUT `/admin/pricing` |
| Import CSV | `src/pages/admin/ImportMessages.jsx` | POST `/admin/import-messages/{user_id}` |
| Settings | `src/pages/admin/Settings.jsx` | API configs |

---

## Axios Configuration

**File:** `frontend/src/api/axios.js`

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.akashvanni.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## Money Handling

**IMPORTANT:** All money values are stored in **paise** (1 rupee = 100 paise)

- `balance: 10000` means 100.00
- `cost: 200` means 2.00
- When displaying, use `*_rupees` fields or divide by 100
- When sending amounts for Razorpay orders, send in **rupees** (converted to paise internally)

---

## Status Values

### Transaction Status
- `pending` - Payment initiated
- `completed` - Payment successful
- `failed` - Payment failed

### Message Status
- `pending` - Message queued
- `sent` - Sent to WhatsApp
- `delivered` - Delivered to recipient
- `read` - Read by recipient
- `failed` - Sending failed

### User Role
- `admin` - Full access
- `customer` - Customer access only

---

## Razorpay Integration

### Configuration

**Backend:** `backend/.env`
```
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

**Frontend:** Pass `key_id` from `/payments/create-order` response to Razorpay checkout.

### Payment Flow

```
1. User clicks "Add Money"
2. Frontend calls POST /payments/create-order with amount
3. Backend creates Razorpay order, returns order_id + key_id
4. Frontend opens Razorpay checkout popup
5. User completes payment
6. Razorpay returns payment_id + signature
7. Frontend calls POST /payments/verify-payment
8. Backend verifies signature, adds balance, creates invoice
```

### Code References

**Backend - Create Order:** `backend/app/routers/payments.py:88-144`
```python
@router.post("/create-order")
def create_order(order_data, current_user, db):
    client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))

    razorpay_order = client.order.create({
        "amount": amount_paise,  # Amount in paise
        "currency": "INR",
        "receipt": f"user_{user_id}_{timestamp}"
    })

    return {
        "order_id": razorpay_order["id"],
        "amount": amount_paise,
        "key_id": KEY_ID
    }
```

**Backend - Verify Payment:** `backend/app/routers/payments.py:146-247`
```python
@router.post("/verify-payment")
def verify_payment(payment_data, current_user, db):
    # Verify signature
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    if expected != signature:
        raise HTTPException(400, "Invalid signature")

    # Add balance
    user.balance += credited_amount
```

**Frontend - Razorpay Checkout:** `frontend/src/pages/customer/AddMoney.jsx`
```javascript
const handlePayment = async () => {
  // 1. Create order
  const { data } = await api.post('/payments/create-order', { amount });

  // 2. Open Razorpay
  const options = {
    key: data.key_id,
    amount: data.amount,
    currency: 'INR',
    order_id: data.order_id,
    handler: async (response) => {
      // 3. Verify payment
      await api.post('/payments/verify-payment', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};
```

### GST Calculation

**File:** `backend/app/routers/payments.py:44-65`

GST is **included** in the payment amount (18% total = 9% CGST + 9% SGST):
```python
GST_RATE = 0.18  # 18%

def calculate_gst(total_amount_paise):
    subtotal = int(total_amount_paise / (1 + GST_RATE))  # 847.46
    gst_amount = total_amount_paise - subtotal           # 152.54
    cgst = gst_amount // 2                               # 76.27
    sgst = gst_amount - cgst                             # 76.27

    return {
        "subtotal": subtotal,    # Base amount
        "cgst": cgst,            # 9%
        "sgst": sgst,            # 9%
        "total": total_amount,   # What user paid
        "credited": subtotal     # What goes to wallet
    }
```

**Example:** User pays ₹100
- Subtotal: ₹84.75 (credited to wallet)
- CGST: ₹7.63
- SGST: ₹7.63
- Total: ₹100.00

---

## C# Implementation Guide

If you want to replace the Python backend with C# (.NET), here's how to implement each component:

### 1. Project Setup

```bash
dotnet new webapi -n WhatsAppDashboard
cd WhatsAppDashboard
dotnet add package Razorpay
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package System.IdentityModel.Tokens.Jwt
```

### 2. Configuration (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=WhatsAppDashboard;Trusted_Connection=True;"
  },
  "Jwt": {
    "Key": "your-super-secret-key-min-32-chars",
    "Issuer": "WhatsAppDashboard",
    "Audience": "WhatsAppDashboard",
    "ExpireMinutes": 10080
  },
  "Razorpay": {
    "KeyId": "rzp_live_xxxxx",
    "KeySecret": "xxxxx"
  },
  "Admin": {
    "Email": "admin@akashvanni.com",
    "Password": "changeme123"
  }
}
```

### 3. Models (Models/User.cs)

```csharp
public class User
{
    public int Id { get; set; }
    public string Email { get; set; }
    public string Name { get; set; }
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string HashedPassword { get; set; }
    public string Role { get; set; } = "customer";  // "admin" or "customer"
    public int Balance { get; set; } = 0;  // in paise
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? GstNumber { get; set; }
    public string? BillingAddress { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public bool GstPromptShown { get; set; } = false;

    public ICollection<Transaction> Transactions { get; set; }
    public ICollection<Message> Messages { get; set; }
    public ICollection<Invoice> Invoices { get; set; }
}
```

### 4. Auth Controller (Controllers/AuthController.cs)

```csharp
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var user = _db.Users.FirstOrDefault(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.HashedPassword))
            return Unauthorized(new { detail = "Incorrect email or password" });

        if (!user.IsActive)
            return StatusCode(403, new { detail = "Account is disabled" });

        var token = GenerateJwtToken(user);
        return Ok(new { access_token = token, token_type = "bearer" });
    }

    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        if (_db.Users.Any(u => u.Email == request.Email))
            return BadRequest(new { detail = "Email already registered" });

        var user = new User
        {
            Email = request.Email,
            Name = request.Name,
            Phone = request.Phone,
            CompanyName = request.CompanyName,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = "customer"
        };

        _db.Users.Add(user);
        _db.SaveChanges();

        return Ok(MapUserResponse(user));
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult GetMe()
    {
        var userId = int.Parse(User.FindFirst("sub")?.Value);
        var user = _db.Users.Find(userId);
        return Ok(MapUserResponse(user));
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("sub", user.Id.ToString()),
            new Claim("email", user.Email),
            new Claim("role", user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                int.Parse(_config["Jwt:ExpireMinutes"])),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

### 5. Payments Controller (Controllers/PaymentsController.cs)

```csharp
[ApiController]
[Route("payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private const decimal GST_RATE = 0.18m;

    [HttpPost("create-order")]
    public IActionResult CreateOrder([FromBody] CreateOrderRequest request)
    {
        var userId = GetCurrentUserId();
        var amountPaise = request.Amount * 100;

        if (amountPaise < 100)
            return BadRequest(new { detail = "Minimum amount is ₹1" });

        // Initialize Razorpay client
        var client = new RazorpayClient(
            _config["Razorpay:KeyId"],
            _config["Razorpay:KeySecret"]
        );

        // Create order
        var orderOptions = new Dictionary<string, object>
        {
            { "amount", amountPaise },
            { "currency", "INR" },
            { "receipt", $"user_{userId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}" }
        };

        var order = client.Order.Create(orderOptions);

        // Save pending transaction
        var transaction = new Transaction
        {
            UserId = userId,
            Amount = amountPaise,
            Type = "credit",
            Status = "pending",
            RazorpayOrderId = order["id"].ToString()
        };
        _db.Transactions.Add(transaction);
        _db.SaveChanges();

        return Ok(new
        {
            order_id = order["id"].ToString(),
            amount = amountPaise,
            currency = "INR",
            key_id = _config["Razorpay:KeyId"]
        });
    }

    [HttpPost("verify-payment")]
    public IActionResult VerifyPayment([FromBody] VerifyPaymentRequest request)
    {
        var userId = GetCurrentUserId();
        var user = _db.Users.Find(userId);

        var transaction = _db.Transactions.FirstOrDefault(t =>
            t.RazorpayOrderId == request.RazorpayOrderId &&
            t.UserId == userId);

        if (transaction == null)
            return NotFound(new { detail = "Transaction not found" });

        if (transaction.Status == "completed")
            return Ok(new { status = "already_verified", balance = user.Balance });

        // Verify signature
        var message = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";
        var expectedSignature = ComputeHmacSha256(
            message,
            _config["Razorpay:KeySecret"]
        );

        if (expectedSignature != request.RazorpaySignature)
        {
            transaction.Status = "failed";
            _db.SaveChanges();
            return BadRequest(new { detail = "Invalid signature" });
        }

        // Calculate GST
        var gst = CalculateGst(transaction.Amount);

        // Generate invoice
        var invoiceNumber = GenerateInvoiceNumber();
        var invoice = new Invoice
        {
            UserId = userId,
            InvoiceNumber = invoiceNumber,
            CustomerName = user.Name,
            CustomerEmail = user.Email,
            Subtotal = gst.Subtotal,
            CgstAmount = gst.Cgst,
            SgstAmount = gst.Sgst,
            TotalAmount = gst.Total,
            CreditedAmount = gst.Credited,
            RazorpayPaymentId = request.RazorpayPaymentId,
            PaymentDate = DateTime.UtcNow,
            Status = "paid"
        };
        _db.Invoices.Add(invoice);

        // Update transaction
        transaction.RazorpayPaymentId = request.RazorpayPaymentId;
        transaction.Status = "completed";
        transaction.Amount = gst.Credited;

        // Add to balance
        user.Balance += gst.Credited;

        _db.SaveChanges();

        return Ok(new
        {
            status = "success",
            invoice_number = invoiceNumber,
            balance_paise = user.Balance,
            balance_rupees = user.Balance / 100m,
            credited_amount = gst.Credited / 100m
        });
    }

    private GstCalculation CalculateGst(int totalAmountPaise)
    {
        var subtotal = (int)(totalAmountPaise / (1 + GST_RATE));
        var gstAmount = totalAmountPaise - subtotal;
        var cgst = gstAmount / 2;
        var sgst = gstAmount - cgst;

        return new GstCalculation
        {
            Subtotal = subtotal,
            Cgst = cgst,
            Sgst = sgst,
            Total = totalAmountPaise,
            Credited = subtotal
        };
    }

    private string ComputeHmacSha256(string message, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }

    private int GetCurrentUserId()
    {
        return int.Parse(User.FindFirst("sub")?.Value);
    }
}
```

### 6. Customer Controller (Controllers/CustomerController.cs)

```csharp
[ApiController]
[Route("customer")]
[Authorize]
public class CustomerController : ControllerBase
{
    private readonly AppDbContext _db;

    [HttpGet("dashboard")]
    public IActionResult GetDashboard()
    {
        var userId = GetCurrentUserId();
        var user = _db.Users.Find(userId);
        var today = DateTime.UtcNow.Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var totalMessages = _db.Messages.Count(m => m.UserId == userId);
        var messagesToday = _db.Messages.Count(m =>
            m.UserId == userId && m.CreatedAt >= today);
        var messagesThisMonth = _db.Messages.Count(m =>
            m.UserId == userId && m.CreatedAt >= monthStart);
        var totalSpent = _db.Messages
            .Where(m => m.UserId == userId)
            .Sum(m => m.Cost);

        return Ok(new
        {
            balance = user.Balance,
            balance_rupees = user.Balance / 100m,
            total_messages = totalMessages,
            messages_today = messagesToday,
            messages_this_month = messagesThisMonth,
            total_spent = totalSpent,
            spent_rupees = totalSpent / 100m
        });
    }

    [HttpGet("transactions")]
    public IActionResult GetTransactions(int skip = 0, int limit = 100)
    {
        var userId = GetCurrentUserId();
        var transactions = _db.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                t.Amount,
                t.Type,
                t.Status,
                t.Description,
                t.RazorpayOrderId,
                t.RazorpayPaymentId,
                t.CreatedAt,
                amount_rupees = t.Amount / 100m
            })
            .ToList();

        return Ok(transactions);
    }

    [HttpGet("messages")]
    public IActionResult GetMessages(int skip = 0, int limit = 100)
    {
        var userId = GetCurrentUserId();
        var messages = _db.Messages
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .ToList();

        return Ok(messages);
    }
}
```

### 7. Admin Controller (Controllers/AdminController.cs)

```csharp
[ApiController]
[Route("admin")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    [HttpGet("dashboard")]
    public IActionResult GetDashboard()
    {
        var today = DateTime.UtcNow.Date;

        return Ok(new
        {
            total_customers = _db.Users.Count(u => u.Role == "customer"),
            active_customers = _db.Users.Count(u =>
                u.Role == "customer" && u.IsActive),
            total_revenue = _db.Transactions
                .Where(t => t.Status == "completed" && t.Type == "credit")
                .Sum(t => t.Amount),
            total_messages = _db.Messages.Count(),
            messages_today = _db.Messages.Count(m => m.CreatedAt >= today)
        });
    }

    [HttpGet("customers")]
    public IActionResult GetCustomers(int skip = 0, int limit = 100, string? search = null)
    {
        var query = _db.Users.Where(u => u.Role == "customer");

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(u =>
                u.Email.Contains(search) ||
                u.Name.Contains(search));
        }

        var customers = query
            .OrderByDescending(u => u.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .ToList();

        return Ok(customers);
    }

    [HttpPut("customers/{userId}")]
    public IActionResult UpdateCustomer(int userId, [FromBody] UpdateCustomerRequest request)
    {
        var user = _db.Users.Find(userId);
        if (user == null)
            return NotFound(new { detail = "User not found" });

        if (request.IsActive.HasValue)
            user.IsActive = request.IsActive.Value;

        if (request.BalanceAdjustment.HasValue && request.BalanceAdjustment != 0)
        {
            user.Balance += request.BalanceAdjustment.Value;

            // Create adjustment transaction
            var transaction = new Transaction
            {
                UserId = userId,
                Amount = Math.Abs(request.BalanceAdjustment.Value),
                Type = request.BalanceAdjustment > 0 ? "credit" : "debit",
                Status = "completed",
                Description = request.AdjustmentReason ??
                    (request.BalanceAdjustment > 0 ? "Admin credit" : "Admin debit")
            };
            _db.Transactions.Add(transaction);
        }

        _db.SaveChanges();
        return Ok(user);
    }

    [HttpGet("pricing")]
    public IActionResult GetPricing()
    {
        var templatePrice = _db.PricingConfigs
            .FirstOrDefault(p => p.MessageType == "template")?.Price ?? 200;
        var sessionPrice = _db.PricingConfigs
            .FirstOrDefault(p => p.MessageType == "session")?.Price ?? 100;

        return Ok(new
        {
            template_price = templatePrice,
            session_price = sessionPrice,
            template_price_rupees = templatePrice / 100m,
            session_price_rupees = sessionPrice / 100m
        });
    }

    [HttpPut("pricing")]
    public IActionResult UpdatePricing([FromBody] UpdatePricingRequest request)
    {
        var templateConfig = _db.PricingConfigs
            .FirstOrDefault(p => p.MessageType == "template");
        var sessionConfig = _db.PricingConfigs
            .FirstOrDefault(p => p.MessageType == "session");

        if (templateConfig != null)
            templateConfig.Price = request.TemplatePrice;
        else
            _db.PricingConfigs.Add(new PricingConfig
            { MessageType = "template", Price = request.TemplatePrice });

        if (sessionConfig != null)
            sessionConfig.Price = request.SessionPrice;
        else
            _db.PricingConfigs.Add(new PricingConfig
            { MessageType = "session", Price = request.SessionPrice });

        _db.SaveChanges();
        return Ok(new { status = "updated" });
    }

    [HttpPost("import-messages/{userId}")]
    public async Task<IActionResult> ImportMessages(int userId, IFormFile file)
    {
        var user = _db.Users.Find(userId);
        if (user == null)
            return NotFound(new { detail = "User not found" });

        using var reader = new StreamReader(file.OpenReadStream());
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        var records = csv.GetRecords<MessageImportRow>().ToList();
        var imported = 0;

        foreach (var row in records)
        {
            var message = new Message
            {
                UserId = userId,
                RecipientPhone = row.RecipientPhone,
                RecipientName = row.RecipientName,
                MessageType = row.MessageType,
                TemplateName = row.TemplateName,
                MessageContent = row.MessageContent,
                Status = row.Status ?? "delivered",
                WhatsappMessageId = row.WhatsappMessageId,
                Cost = row.Cost ?? 200,
                SentAt = row.SentAt,
                DeliveredAt = row.DeliveredAt,
                ReadAt = row.ReadAt
            };
            _db.Messages.Add(message);
            imported++;
        }

        _db.SaveChanges();
        return Ok(new { imported, total = records.Count });
    }
}
```

### 8. Program.cs Setup

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            "https://akashvanni.com",
            "http://localhost:5173"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

builder.Services.AddControllers();

var app = builder.Build();

// Seed admin user on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    if (!db.Users.Any(u => u.Role == "admin"))
    {
        db.Users.Add(new User
        {
            Email = builder.Configuration["Admin:Email"],
            Name = "Admin",
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(
                builder.Configuration["Admin:Password"]),
            Role = "admin"
        });
        db.SaveChanges();
    }
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

### 9. Required NuGet Packages

```xml
<ItemGroup>
  <PackageReference Include="BCrypt.Net-Next" Version="4.0.3" />
  <PackageReference Include="CsvHelper" Version="31.0.0" />
  <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.0" />
  <PackageReference Include="Razorpay" Version="3.0.0" />
</ItemGroup>
```

---

## Key Differences: Python vs C#

| Feature | Python (FastAPI) | C# (.NET) |
|---------|-----------------|-----------|
| Routing | `@router.post("/path")` | `[HttpPost("path")]` |
| Dependency Injection | `Depends(get_db)` | Constructor injection |
| Password Hashing | `passlib` | `BCrypt.Net` |
| JWT | `python-jose` | `System.IdentityModel.Tokens.Jwt` |
| ORM | SQLAlchemy | Entity Framework |
| Razorpay | `razorpay` package | `Razorpay` NuGet |
| HMAC Signature | `hmac.new()` | `HMACSHA256` |

---

## Webhook Configuration

### Razorpay Webhook URL
Set in Razorpay Dashboard: `https://api.akashvanni.com/payments/webhook`

### Webhook Events to Enable
- `payment.captured` - When payment is successful

### Webhook Security
```python
# Python
signature = request.headers.get("X-Razorpay-Signature")
expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
```

```csharp
// C#
var signature = Request.Headers["X-Razorpay-Signature"];
using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
var expected = BitConverter.ToString(
    hmac.ComputeHash(payload)).Replace("-", "").ToLower();
```
