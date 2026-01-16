# WhatsApp Dashboard

A complete dashboard for managing WhatsApp messaging with Razorpay payment integration.

## Features

### Customer Dashboard
- View balance and transaction history
- Track message status (pending, sent, delivered, read)
- Add money via Razorpay
- View pricing

### Admin Dashboard
- Manage customers (activate/deactivate, adjust balance)
- Configure pricing (template: ₹2, session: ₹1)
- Set up API integrations (WhatsApp)
- View all transactions and messages
- Revenue analytics

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **Payments**: Razorpay

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your Razorpay credentials

# Run server
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:5173

## Default Credentials

**Admin:**
- Email: admin@example.com
- Password: admin123

⚠️ **Change the admin password immediately in production!**

## Configuration

### Backend (.env)

```env
SECRET_KEY=your-super-secret-key-change-this
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

## Pricing Configuration

Default pricing (configurable in admin panel):
- Template Message: ₹2 (200 paise)
- Session Message: ₹1 (100 paise)

## API Endpoints

### Auth
- `POST /auth/register` - Register customer
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Customer
- `GET /customer/dashboard` - Dashboard stats
- `GET /customer/transactions` - Transaction history
- `GET /customer/messages` - Message history
- `GET /customer/balance` - Current balance

### Payments
- `POST /payments/create-order` - Create Razorpay order
- `POST /payments/verify-payment` - Verify payment
- `POST /payments/webhook` - Razorpay webhook

### Messages
- `POST /messages/send` - Send message
- `GET /messages/{id}` - Get message status
- `POST /messages/webhook/status` - WhatsApp status webhook

### Admin
- `GET /admin/dashboard` - Admin stats
- `GET /admin/customers` - List customers
- `PUT /admin/customers/{id}` - Update customer
- `GET /admin/pricing` - Get pricing
- `PUT /admin/pricing` - Update pricing
- `GET /admin/api-configs` - Get API configs
- `POST /admin/api-configs` - Add API config

## WhatsApp Integration

To enable WhatsApp messaging:

1. Get API credentials from your provider (Gupshup, WATI, Meta, etc.)
2. Go to Admin → Settings
3. Add a configuration named "whatsapp" with:
   - API URL
   - API Key
   - API Secret (if required)

The system will automatically use these credentials when sending messages.

## Deployment

### Railway (Recommended)

1. Create a new project
2. Add PostgreSQL addon
3. Deploy backend from GitHub
4. Deploy frontend from GitHub
5. Set environment variables

### Docker (Coming Soon)

Docker support will be added for easier deployment.

## Upgrading to PostgreSQL

1. Install `psycopg2-binary`
2. Update DATABASE_URL in .env:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```
3. Remove SQLite-specific settings from database.py

## License

MIT
