# Multi-Tenant Client-Server Setup Guide

Panduan lengkap untuk setup sistem multi-tenant dengan Central Server dan Client App.

## Arsitektur Sistem

```
┌─────────────────────┐
│  Central Server     │  ← Anda host di VPS/Cloud
│  (License Manager)  │     Manage semua client/pelanggan
└──────────┬──────────┘
           │
    ┌──────┴───────┬──────────────┬──────────────┐
    │              │              │              │
┌───▼────┐    ┌───▼────┐    ┌───▼────┐    ┌───▼────┐
│Client 1│    │Client 2│    │Client 3│    │Client N│
│(Laptop)│    │(Laptop)│    │(Laptop)│    │(Laptop)│
└────────┘    └────────┘    └────────┘    └────────┘
  Pelanggan A  Pelanggan B  Pelanggan C  Pelanggan N
```

## Part 1: Setup Central Server (Di Server Anda)

### 1.1 Persyaratan

- VPS/Cloud server (DigitalOcean, AWS, Google Cloud, etc.)
- Domain (opsional tapi direkomendasikan)
- SSL Certificate (wajib untuk production)

### 1.2 Installation

```bash
# 1. Clone atau copy folder central_server ke VPS
cd /path/to/your/server
git clone <your-repo> atau scp -r central_server user@server:/path/

# 2. Masuk ke directory
cd central_server

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy .env.example ke .env
cp .env.example .env

# 5. EDIT .env dan GANTI:
nano .env
# - SECRET_KEY (gunakan password generator, min 32 chars)
# - ADMIN_PASSWORD (password admin Anda)
# - DATABASE_URL (jika pakai PostgreSQL)
```

### 1.3 Running Central Server

Development (untuk test):
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Production (gunakan screen/tmux atau systemd):
```bash
# Dengan screen:
screen -S central_server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4

# Atau buat systemd service (recommended):
sudo nano /etc/systemd/system/central-server.service
```

Example systemd service:
```ini
[Unit]
Description=Instagram Tools Central Server
After=network.target

[Service]
User=your-user
WorkingDirectory=/path/to/central_server
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable central-server
sudo systemctl start central-server
sudo systemctl status central-server
```

### 1.4 Setup Nginx Reverse Proxy (Production)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Setup SSL dengan Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 1.5 Create Client Account

Gunakan API atau Python script:

```python
import httpx

response = httpx.post(
    "http://your-domain.com/api/v1/clients",
    json={
        "client_name": "pelanggan_jakarta_1",  # Username untuk client
        "password": "password_rahasia_123",    # Password untuk client
        "company_name": "PT Pelanggan Jakarta",
        "email": "pelanggan@email.com",
        "phone": "08123456789",
        "license_type": "monthly",
        "max_accounts": 100,
        "max_proxies": 50,
        "notes": "Pelanggan dari Jakarta"
    }
)

print(response.json())
# SIMPAN client_name dan password - berikan ke pelanggan Anda
```

Atau gunakan API docs di `http://your-domain.com/docs`

## Part 2: Setup Client App (Di Komputer Pelanggan)

### 2.1 Installation Tools

```bash
# 1. Clone atau copy seluruh project (kecuali central_server)
git clone <your-repo>
cd tools-ig

# 2. Setup backend
cd backend
pip install -r requirements.txt

# 3. Copy .env.example ke .env
cp .env.example .env
```

### 2.2 Configure .env untuk Client

Edit `backend/.env`:

```env
# Database Configuration (tetap sama)
POSTGRES_SERVER=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=instagram_automation
POSTGRES_PORT=5432

# Redis Configuration (tetap sama)
REDIS_HOST=redis
REDIS_PORT=6379

# ===== CENTRAL SERVER LICENSE =====
# AKTIFKAN INI:
CENTRAL_SERVER_ENABLED=true
CENTRAL_SERVER_URL=https://your-central-server.com
CLIENT_NAME=pelanggan_jakarta_1
CLIENT_PASSWORD=password_rahasia_123
```

### 2.3 Start Client App

```bash
# Start dengan Docker (recommended)
docker-compose up -d

# Atau manual:
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 - Worker
cd backend
celery -A app.worker worker --loglevel=info

# Terminal 3 - Frontend
cd frontend
npm run dev
```

### 2.4 Verification

Jika berhasil, Anda akan melihat di console:

```
✅ Successfully authenticated with Central Server
   Client: pelanggan_jakarta_1
   Session ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✅ Central Server integration enabled - heartbeat every 900s
```

Jika gagal:

```
❌ CRITICAL: License validation failed!
============================================================
Please check:
1. Central Server is running
2. CENTRAL_SERVER_URL in .env is correct
3. CLIENT_NAME and CLIENT_PASSWORD are correct
4. Your client account is active
============================================================
```

## Part 3: Monitoring (Admin)

### 3.1 Access Admin Panel

Buka Central Server API docs:
```
https://your-central-server.com/docs
```

### 3.2 Monitor Client Activity

#### Get All Clients Overview:
```
GET /api/v1/analytics/clients
```

Response:
```json
[
  {
    "id": 1,
    "client_name": "pelanggan_jakarta_1",
    "company_name": "PT Pelanggan Jakarta",
    "is_active": true,
    "license_type": "monthly",
    "last_active": "2026-02-04T20:00:00Z",
    "session_active": true,
    "total_activities": 150,
    "latest_stats": {
      "total_accounts": 50,
      "active_accounts": 45,
      "tasks_completed": 1000,
      "tasks_failed": 50
    }
  }
]
```

#### Get Detailed Client Analytics:
```
GET /api/v1/analytics/clients/{client_id}
```

#### Get Activity Logs:
```
GET /api/v1/activity/client/{client_id}
```

### 3.3 Manage Clients

#### Deactivate Client (Kick/Block):
```
PUT /api/v1/clients/{client_id}/deactivate
```
→ Client akan langsung tidak bisa login lagi

#### Activate Client:
```
PUT /api/v1/clients/{client_id}/activate
```

#### Update Client Info:
```
PUT /api/v1/clients/{client_id}
{
  "max_accounts": 200,
  "notes": "Upgrade to premium"
}
```

## Part 4: Single-Device Session Enforcement

### Cara Kerja:

1. Client A login di Device 1 → dapat session_id_1
2. Client A login di Device 2 → dapat session_id_2
3. Session_id_1 otomatis invalid
4. Device 1 akan dapat error "Session Invalidated" saat melakukan request berikutnya

Jika Anda ingin kick client dari device tertentu:
```python
# Method 1: Deactivate lalu activate lagi
PUT /api/v1/clients/{id}/deactivate  # Kick dari semua device
PUT /api/v1/clients/{id}/activate    # Client harus login ulang
```

## Part 5: Troubleshooting

### Client tidak bisa connect ke Central Server

1. Check Central Server running:
   ```bash
   curl https://your-server.com/health
   ```

2. Check firewall allow port 443/80

3. Check SSL certificate valid

4. Check CLIENT_NAME dan CLIENT_PASSWORD benar

### Client terkick terus-terusan

→ Kemungkinan ada 2 device login dengan akun yang sama
→ Check `current_device_info` di database Central Server

### Heartbeat error

→ Normal jika sesekali error (network issue)
→ Jika terus-menerus, check network connectivity

## Part 6: Production Checklist

### Central Server:

- [ ] SECRET_KEY di-ganti dengan value random (min 32 chars)
- [ ] Database gunakan PostgreSQL (bukan SQLite)
- [ ] Setup SSL certificate (HTTPS)
- [ ] Setup firewall (hanya allow port 443, 80, 22)
- [ ] Setup backup database
- [ ] Setup monitoring (uptimerobot, etc.)
- [ ] ADMIN_PASSWORD strong & secure

### Client App:

- [ ] CENTRAL_SERVER_URL gunakan HTTPS (bukan HTTP)
- [ ] CLIENT_PASSWORD disimpan dengan aman
- [ ] Test koneksi sebelum deploy ke pelanggan
- [ ] Berikan panduan ke pelanggan cara setup

## FAQ

**Q: Apakah account Instagram pelanggan tersimpan di Central Server?**
A: TIDAK. Hanya analytics & metadata yang dikirim. Account credentials tetap di database lokal pelanggan.

**Q: Bagaimana cara update password client?**
A: Gunakan `PUT /api/v1/clients/{id}` dengan `{"password": "new_password"}`

**Q: Bisakah client bypass license?**
A: Tidak mudah, karena auth token harus valid dan session harus match. Tapi untuk extra security, bisa implement API key checking juga.

**Q: Apakah bisa offline?**
A: Tidak. Client harus online untuk validate license. Ini sesuai requirement Anda.

**Q: Berapa lama session valid?**
A: Token JWT valid 30 hari (configurable). Session valid sampai ada login dari device lain atau admin deactivate client.

---

**Support**: Jika ada pertanyaan, hubungi administrator.
