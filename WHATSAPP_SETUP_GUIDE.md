# WhatsApp Business API Setup Guide

## Overview
This guide explains how to set up WhatsApp Business API integration using Meta (Facebook) Cloud API Direct approach.

---

## 1. Frontend Deployment (Hostinger)

### Ready to Upload
- **File:** `frontend/hostinger-build.zip` (297KB)
- **Action:** Upload and extract to your Hostinger public_html folder

---

## 2. Database Migration

### New Fields Added to User Model
Run these commands on your server to update the database:

```bash
cd backend

# Generate migration
alembic revision --autogenerate -m "Add WhatsApp Business fields to User"

# Apply migration
alembic upgrade head
```

### New Fields Added:
| Field | Type | Description |
|-------|------|-------------|
| `whatsapp_access_token` | Text | Meta access token |
| `whatsapp_waba_id` | String(100) | WhatsApp Business Account ID |
| `whatsapp_phone_number_id` | String(100) | Phone Number ID for API calls |
| `whatsapp_phone_number` | String(20) | Display phone number |
| `whatsapp_business_name` | String(255) | Business name from Meta |
| `whatsapp_display_name` | String(255) | Verified display name |
| `whatsapp_quality_rating` | String(20) | GREEN, YELLOW, RED |
| `whatsapp_connected_at` | DateTime | When connected |

---

## 3. Meta Developer Setup (One-Time)

### Step 1: Create Meta App
1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Select **Business** type
4. Enter app name (e.g., "Akashvanni WhatsApp")
5. Create the app

### Step 2: Add WhatsApp Product
1. In your app dashboard, click **Add Product**
2. Find **WhatsApp** and click **Set Up**
3. Follow the setup wizard

### Step 3: Configure Facebook Login
1. Add **Facebook Login** product to your app
2. Go to Facebook Login > Settings
3. Add this to **Valid OAuth Redirect URIs**:
   ```
   https://akashvanni.com/whatsapp-connect
   ```

### Step 4: Get App Credentials
1. Go to **App Settings > Basic**
2. Copy **App ID**
3. Copy **App Secret** (click Show)

### Step 5: Configure Embedded Signup (Optional)
1. Go to WhatsApp > Embedded Signup
2. Create a configuration
3. Copy the **Config ID**

---

## 4. Backend Environment Variables

Add these to your backend `.env` file:

```env
# Meta WhatsApp Configuration
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
META_REDIRECT_URI=https://akashvanni.com/whatsapp-connect
META_CONFIG_ID=your_config_id_here
META_WEBHOOK_VERIFY_TOKEN=generate_a_random_string_here
```

**Or** configure via Admin Panel at `/admin/whatsapp`

---

## 5. Webhook Setup (For Message Status Updates)

### In Meta Developer Dashboard:
1. Go to WhatsApp > Configuration
2. Set **Webhook URL**: `https://api.akashvanni.com/whatsapp/webhook`
3. Set **Verify Token**: Same as `META_WEBHOOK_VERIFY_TOKEN` in your .env
4. Subscribe to these fields:
   - `messages`
   - `message_deliveries`
   - `message_reads`

---

## 6. New Routes Created

### Customer Routes:
| Route | Page | Description |
|-------|------|-------------|
| `/whatsapp-connect` | WhatsAppConnect | Connect WhatsApp Business account |

### Admin Routes:
| Route | Page | Description |
|-------|------|-------------|
| `/admin/whatsapp` | WhatsAppSettings | Configure Meta API settings |

### Backend API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/whatsapp/oauth-url` | Get OAuth URL for Facebook login |
| POST | `/whatsapp/connect` | Complete OAuth and save tokens |
| GET | `/whatsapp/connection-status` | Check if WhatsApp connected |
| POST | `/whatsapp/disconnect` | Disconnect WhatsApp |
| POST | `/whatsapp/test-connection` | Test API connection |
| POST | `/whatsapp/send-message` | Send single message |
| POST | `/whatsapp/send-bulk` | Send bulk messages |
| GET | `/whatsapp/webhook` | Webhook verification |
| POST | `/whatsapp/webhook` | Receive webhook events |
| GET | `/admin/whatsapp-config` | Get WhatsApp config |
| PUT | `/admin/whatsapp-config` | Update WhatsApp config |
| GET | `/admin/whatsapp-customers` | List connected customers |

---

## 7. Files Changed/Created

### New Files:
- `frontend/src/pages/customer/WhatsAppConnect.jsx`
- `frontend/src/pages/admin/WhatsAppSettings.jsx`
- `backend/app/routers/whatsapp.py`

### Modified Files:
- `frontend/src/App.jsx` - Added routes
- `frontend/src/components/Layout.jsx` - Added sidebar links
- `backend/app/main.py` - Included whatsapp router
- `backend/app/models.py` - Added WhatsApp fields
- `backend/app/routers/admin.py` - Added config endpoints

---

## 8. How It Works (Customer Flow)

1. Customer clicks "Connect WhatsApp" in sidebar
2. Customer sees benefits and clicks "Connect with Facebook"
3. Customer logs into Facebook and grants permissions
4. Meta redirects back with authorization code
5. Backend exchanges code for access token
6. Backend fetches WhatsApp Business Account details
7. Details saved to database
8. Customer can now send WhatsApp messages

---

## 9. Deployment Checklist

### Backend:
- [ ] Add environment variables to `.env`
- [ ] Run database migration (`alembic upgrade head`)
- [ ] Restart backend server

### Frontend:
- [ ] Upload `hostinger-build.zip` to Hostinger
- [ ] Extract in public_html

### Meta Dashboard:
- [ ] Create Meta App
- [ ] Add WhatsApp product
- [ ] Configure OAuth redirect URI
- [ ] Set up webhook URL
- [ ] Get App ID and Secret

### Admin Panel:
- [ ] Go to `/admin/whatsapp`
- [ ] Enter Meta App credentials
- [ ] Save settings

---

## 10. Testing

1. Login as a customer
2. Go to WhatsApp page
3. Click "Connect with Facebook"
4. Complete Facebook login
5. Check connection status shows connected
6. Try sending a test message

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs
3. Verify Meta App is in Live mode (not Development)
4. Ensure OAuth redirect URI matches exactly
