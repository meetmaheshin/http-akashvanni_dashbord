# Deployment Guide for akashvanni.com

## Architecture

```
akashvanni.com (Frontend) ──► api.akashvanni.com (Backend API)
                                        │
                                        ▼
                                   PostgreSQL DB
```

## Option 1: Railway (Recommended - Easiest)

### Step 1: Create GitHub Repository

```bash
cd d:/invoaice_dashbord
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-dashboard.git
git push -u origin main
```

### Step 2: Deploy Backend on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Python
5. Add PostgreSQL: Click "New" → "Database" → "PostgreSQL"
6. Set environment variables (Settings → Variables):

```
SECRET_KEY=generate-a-random-64-char-string
RAZORPAY_KEY_ID=rzp_live_S4PTsplUbRWG15
RAZORPAY_KEY_SECRET=UjstVC6f5wpcJoSZnRCx9PQe
ADMIN_EMAIL=admin@akashvanni.com
ADMIN_PASSWORD=YourSecurePassword123!
FRONTEND_URL=https://akashvanni.com
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

7. Add custom domain: Settings → Domains → Add `api.akashvanni.com`

### Step 3: Deploy Frontend on Railway (or Vercel)

**Option A: Railway**
1. Create another service in same project
2. Set root directory to `/frontend`
3. Add domain: `akashvanni.com`

**Option B: Vercel (Better for frontend)**
1. Go to https://vercel.com
2. Import your GitHub repo
3. Set root directory: `frontend`
4. Add environment variable:
   - `VITE_API_URL=https://api.akashvanni.com`
5. Add domain: `akashvanni.com`

### Step 4: DNS Configuration

In your domain registrar, add these records:

| Type | Name | Value |
|------|------|-------|
| CNAME | api | railway-provided-url |
| CNAME | @ or www | vercel-provided-url (or railway) |

---

## Option 2: Hostinger VPS

### Requirements
- Ubuntu 22.04 VPS
- SSH access

### Step 1: Connect to VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Install Dependencies
```bash
apt update && apt upgrade -y
apt install python3.11 python3.11-venv python3-pip nginx certbot python3-certbot-nginx postgresql postgresql-contrib -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y
```

### Step 3: Set up PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE whatsapp_dashboard;
CREATE USER dashboard_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_dashboard TO dashboard_user;
\q
```

### Step 4: Deploy Backend
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/whatsapp-dashboard.git
cd whatsapp-dashboard/backend

python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SECRET_KEY=your-64-char-secret-key
DATABASE_URL=postgresql://dashboard_user:your_secure_password@localhost/whatsapp_dashboard
RAZORPAY_KEY_ID=rzp_live_S4PTsplUbRWG15
RAZORPAY_KEY_SECRET=UjstVC6f5wpcJoSZnRCx9PQe
ADMIN_EMAIL=admin@akashvanni.com
ADMIN_PASSWORD=YourSecurePassword123!
FRONTEND_URL=https://akashvanni.com
EOF
```

### Step 5: Create Systemd Service
```bash
cat > /etc/systemd/system/dashboard-api.service << EOF
[Unit]
Description=WhatsApp Dashboard API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/whatsapp-dashboard/backend
Environment="PATH=/var/www/whatsapp-dashboard/backend/venv/bin"
ExecStart=/var/www/whatsapp-dashboard/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl enable dashboard-api
systemctl start dashboard-api
```

### Step 6: Build Frontend
```bash
cd /var/www/whatsapp-dashboard/frontend
npm install
VITE_API_URL=https://api.akashvanni.com npm run build
```

### Step 7: Configure Nginx
```bash
cat > /etc/nginx/sites-available/akashvanni << EOF
# Frontend
server {
    listen 80;
    server_name akashvanni.com www.akashvanni.com;
    root /var/www/whatsapp-dashboard/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# API
server {
    listen 80;
    server_name api.akashvanni.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

ln -s /etc/nginx/sites-available/akashvanni /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 8: SSL Certificate
```bash
certbot --nginx -d akashvanni.com -d www.akashvanni.com -d api.akashvanni.com
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| SECRET_KEY | JWT signing key (64 chars) | `openssl rand -hex 32` |
| DATABASE_URL | PostgreSQL connection | `postgresql://user:pass@host/db` |
| RAZORPAY_KEY_ID | Razorpay key | `rzp_live_xxx` |
| RAZORPAY_KEY_SECRET | Razorpay secret | `xxx` |
| ADMIN_EMAIL | Admin login email | `admin@akashvanni.com` |
| ADMIN_PASSWORD | Admin login password | `SecurePass123!` |
| FRONTEND_URL | Frontend domain | `https://akashvanni.com` |

---

## After Deployment

1. Visit https://akashvanni.com
2. Login with your admin credentials
3. Change password in admin settings
4. Configure WhatsApp API in Settings

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
