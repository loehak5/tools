# Instagram Tools - Central Server

Server pusat untuk manage multi-tenant client Instagram automation tools.

## Features

- **Client Management**: CRUD operations untuk manage pelanggan
- **Authentication**: JWT-based authentication dengan single-device session enforcement
- **Activity Tracking**: Log semua aktivitas dari setiap client
- **Analytics Dashboard**: Statistics dan trending data per client
- **Session Management**: Satu akun hanya bisa login di satu device

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy `.env.example` ke `.env` dan edit sesuai kebutuhan:
```bash
copy .env.example .env
```

3. **IMPORTANT**: Edit `.env` dan ganti `SECRET_KEY` dan `ADMIN_PASSWORD`!

## Running the Server

Development mode:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Production mode (gunakan gunicorn atau similar):
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Documentation

Setelah server running, akses:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /login` - Client login
- `POST /logout` - Client logout
- `POST /check-session` - Check session validity
- `POST /heartbeat` - Send heartbeat + stats

### Client Management (`/api/v1/clients`) - Admin Only
- `GET /` - List all clients
- `GET /{id}` - Get client details
- `POST /` - Create new client
- `PUT /{id}` - Update client
- `PUT /{id}/activate` - Activate client
- `PUT /{id}/deactivate` - Deactivate client
- `DELETE /{id}` - Delete client

### Activity (`/api/v1/activity`)
- `POST /report` - Client reports activity (authenticated)
- `GET /client/{id}` - Get client activities (admin)

### Analytics (`/api/v1/analytics`) - Admin Only
- `GET /clients` - Overview all clients
- `GET /clients/{id}` - Detailed client analytics
- `POST /clients/{id}/stats` - Update client stats
- `GET /clients/{id}/usage-trend` - Usage trend data

## Creating First Client

Gunakan API `/api/v1/clients` POST endpoint atau script Python:

```python
import httpx

response = httpx.post(
    "http://localhost:8001/api/v1/clients",
    json={
        "client_name": "client_test_1",
        "password": "password123",
        "company_name": "PT Test Indonesia",
        "email": "test@example.com",
        "license_type": "monthly",
        "max_accounts": 100,
        "max_proxies": 50
    }
)

print(response.json())
# Save the client_name and password untuk client app
```

## Database

Default menggunakan SQLite (`central_server.db`).

Untuk production, ganti ke PostgreSQL di `.env`:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
```

Dan install dependency tambahan:
```bash
pip install asyncpg
```

## Security Notes

1. **WAJIB ganti `SECRET_KEY`** di `.env` dengan value random yang aman
2. **Gunakan HTTPS** untuk production deployment
3. Password client di-hash dengan bcrypt
4. JWT token expire setelah 30 hari (configurable)

## Deployment

Untuk production:
1. Deploy ke VPS/Cloud (DigitalOcean, AWS, Google Cloud, etc.)
2. Setup domain dan SSL certificate
3. Gunakan PostgreSQL sebagai database
4. Setup reverse proxy (nginx) di depan uvicorn
5. Configure firewall untuk port 443 (HTTPS)

## Support

Untuk pertanyaan, hubungi administrator.
