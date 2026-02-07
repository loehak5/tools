# Quick Start - Multi-Tenant Setup

Panduan kilat untuk setup sistem rental multi-tenant.

## Option 1: Test Locally (Development)

### Step 1: Start Central Server

```bash
cd central_server
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

### Step 2: Create Test Client

```bash
# In another terminal
cd central_server
python test_server.py http://localhost:8001
```

This will create a test client named `test_client_demo`.

### Step 3: Configure & Start Client App

```bash
# Edit backend/.env
cd backend
nano .env
```

Add these lines:
```env
CENTRAL_SERVER_ENABLED=true
CENTRAL_SERVER_URL=http://localhost:8001
CLIENT_NAME=test_client_demo
CLIENT_PASSWORD=test123
```

Start the app:
```bash
docker-compose up -d
```

### Step 4: Verify

Check backend logs:
```bash
docker logs -f tools-ig-backend-1
```

You should see:
```
✅ Successfully authenticated with Central Server
```

---

## Option 2: Production Deployment

### Server Side (Central Server)

```bash
# 1. On your VPS
git clone <repo>
cd central_server

# 2. Install
pip install -r requirements.txt

# 3. Configure
cp .env.example .env
nano .env
# Change SECRET_KEY, ADMIN_PASSWORD, DATABASE_URL

# 4. Run (production)
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4

# 5. Setup SSL & Nginx (see MULTITENANT_SETUP.md)
```

### Client Side (Pelanggan's Computer)

```bash
# 1. Get credentials from admin (CLIENT_NAME, CLIENT_PASSWORD)

# 2. Edit .env
cd tools-ig/backend
nano .env
```

Add:
```env
CENTRAL_SERVER_ENABLED=true
CENTRAL_SERVER_URL=https://your-central-server.com
CLIENT_NAME=<from_admin>
CLIENT_PASSWORD=<from_admin>
```

```bash
# 3. Start
docker-compose up -d
```

---

## Creating New Client Accounts

### Via Python:

```python
import httpx

response = httpx.post(
    "https://your-server.com/api/v1/clients",
    json={
        "client_name": "new_client",
        "password": "secure_password",
        "company_name": "Customer Co",
        "license_type": "monthly",
        "max_accounts": 100
    }
)
print(response.json())
```

### Via API Docs:

1. Go to `https://your-server.com/docs`
2. Find `POST /api/v1/clients`
3. Click "Try it out"
4. Fill in the form
5. Execute

---

## Monitoring

### View All Clients:
`GET https://your-server.com/api/v1/analytics/clients`

### View Client Details:
`GET https://your-server.com/api/v1/analytics/clients/{id}`

### Disable Client:
`PUT https://your-server.com/api/v1/clients/{id}/deactivate`

---

## Troubleshooting

**Client can't connect?**
- Check Central Server is running: `curl https://your-server.com/health`
- Check firewall allows port 443/80
- Verify CLIENT_NAME and CLIENT_PASSWORD correct

**License validation failed?**
- Ensure client account exists and is active
- Check CENTRAL_SERVER_URL is correct (include https://)
- Verify client hasn't been deactivated

**Want to disable a client?**
```bash
curl -X PUT https://your-server.com/api/v1/clients/{id}/deactivate
```

---

For detailed setup, see [MULTITENANT_SETUP.md](file:///c:/Users/NAR/Documents/tools-ig/MULTITENANT_SETUP.md)
