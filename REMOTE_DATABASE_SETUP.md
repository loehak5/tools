# Setup Database Remote untuk Central Server

Panduan lengkap untuk mengkonfigurasi Central Server menggunakan **database MySQL remote** yang sudah disediakan.

## Informasi Database Remote

```
Host     : instatools-database.ddns.net
Port     : 3306 (default MySQL)
Username : insta-manager
Database : insta-manager
Password : XLph5w84m4eBB6Te
```

## Langkah-Langkah Setup

### 1. Install Dependencies

Pastikan Anda sudah install dependencies MySQL yang diperlukan:

```bash
cd c:\Users\NAR\Documents\tools-ig\central_server
pip install -r requirements.txt
```

Dependencies baru yang ditambahkan:
- `aiomysql>=0.2.0` - MySQL async driver
- `PyMySQL>=1.1.0` - Dependency untuk aiomysql

### 2. Konfigurasi Environment Variables

Buat file `.env` di folder `central_server`:

```bash
cd c:\Users\NAR\Documents\tools-ig\central_server
copy .env.example .env
```

Edit file `.env` dengan konfigurasi berikut:

```env
# Project Info
PROJECT_NAME=Instagram Tools Central Server
API_V1_STR=/api/v1

# MySQL Remote Database Configuration
MYSQL_HOST=instatools-database.ddns.net
MYSQL_PORT=3306
MYSQL_USER=insta-manager
MYSQL_PASSWORD=XLph5w84m4eBB6Te
MYSQL_DATABASE=insta-manager

# Security - GANTI INI!
SECRET_KEY=ganti-dengan-random-string-minimal-32-karakter-untuk-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# CORS Origins
BACKEND_CORS_ORIGINS=["*"]

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti-password-admin-yang-kuat
```

> **⚠️ PENTING**: Ganti `SECRET_KEY` dan `ADMIN_PASSWORD` dengan nilai yang aman untuk production!

### 3. Buat Tabel di Database Remote

Jalankan script untuk membuat semua tabel yang diperlukan:

```bash
cd c:\Users\NAR\Documents\tools-ig\central_server
python create_tables.py
```

Output yang diharapkan:
```
============================================================
Central Server - Database Table Creation
============================================================
Database URL: instatools-database.ddns.net:3306/insta-manager
============================================================

🔍 Testing database connection...
✅ Database connection successful!

🔨 Creating tables...
✅ All tables created successfully!

============================================================
✅ Database setup completed!
============================================================

Tables created:
  - clients
  - activity_logs
  - usage_stats
```

### 4. Verifikasi Tabel Berhasil Dibuat

Anda bisa login ke database remote untuk memverifikasi tabel sudah dibuat:

**Menggunakan MySQL Client:**
```bash
mysql -h instatools-database.ddns.net -u insta-manager -p insta-manager
# Password: XLph5w84m4eBB6Te

# Setelah login:
SHOW TABLES;
```

**Expected Output:**
```
+-------------------------+
| Tables_in_insta-manager |
+-------------------------+
| activity_logs           |
| clients                 |
| usage_stats             |
+-------------------------+
```

**Cek struktur tabel:**
```sql
DESCRIBE clients;
DESCRIBE activity_logs;
DESCRIBE usage_stats;
```

### 5. Start Central Server

Sekarang Central Server sudah bisa dijalankan:

```bash
cd c:\Users\NAR\Documents\tools-ig\central_server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Server akan start dan menggunakan database remote.

### 6. Buat Client Account Pertama

Buka browser dan akses API documentation:
```
http://localhost:8001/docs
```

Gunakan endpoint `POST /api/v1/clients` untuk membuat client baru:

**Request Body:**
```json
{
  "client_name": "client_test_1",
  "password": "password_rahasia_123",
  "company_name": "Test Company",
  "email": "test@example.com",
  "phone": "08123456789",
  "license_type": "monthly",
  "max_accounts": 100,
  "max_proxies": 50,
  "notes": "Client untuk testing"
}
```

**Response:**
```json
{
  "id": 1,
  "client_name": "client_test_1",
  "api_key": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "is_active": true,
  ...
}
```

**💾 SIMPAN**: `client_name` dan `password` - ini akan digunakan untuk login dari aplikasi tools.

### 7. Test Login Client

Gunakan endpoint `POST /api/v1/auth/login`:

**Request Body:**
```json
{
  "client_name": "client_test_1",
  "password": "password_rahasia_123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "client_name": "client_test_1"
}
```

✅ Jika mendapat access token, setup berhasil!

## Keuntungan Menggunakan Database Remote

✅ **Centralized Management**: Kelola semua client dari satu database pusat  
✅ **Data Persistence**: Data aman meskipun server pindah lokasi  
✅ **Real-time Monitoring**: Pantau aktivitas client dari mana saja  
✅ **Scalability**: Bisa menambah server central_server tanpa duplikasi data  

## Troubleshooting

### ❌ Error: "Can't connect to MySQL server"

**Penyebab:**
- Database server tidak running
- Firewall memblokir port 3306
- Hostname tidak bisa di-resolve

**Solusi:**
1. Ping hostname untuk cek koneksi:
   ```bash
   ping instatools-database.ddns.net
   ```

2. Test koneksi MySQL secara langsung:
   ```bash
   mysql -h instatools-database.ddns.net -u insta-manager -p
   ```

3. Pastikan port 3306 tidak diblokir firewall

### ❌ Error: "Access denied for user"

**Penyebab:**
- Username atau password salah
- User tidak punya permission ke database

**Solusi:**
1. Verifikasi credentials di `.env` sudah benar
2. Pastikan user `insta-manager` punya akses ke database `insta-manager`

### ❌ Error: "Unknown database 'insta-manager'"

**Penyebab:**
- Database belum dibuat di server MySQL

**Solusi:**
1. Login ke MySQL server
2. Buat database:
   ```sql
   CREATE DATABASE `insta-manager` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### ⚠️ Server lambat / timeout

**Penyebab:**
- Latency tinggi ke database remote
- Connection pool tidak optimal

**Solusi:**
1. Jika database jauh secara geografis, pertimbangkan untuk:
   - Pindah server central_server lebih dekat ke database
   - Atau pindah database lebih dekat ke server

2. Tuning connection pool di `app/db/session.py`:
   ```python
   engine = create_async_engine(
       database_url,
       pool_size=10,        # Adjust based on load
       max_overflow=20,     # Max additional connections
       pool_recycle=3600,   # Recycle connections every hour
   )
   ```

## Tips Keamanan

🔒 **Secret Key**: Gunakan random string minimal 32 karakter. Generate dengan:
```python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

🔒 **Admin Password**: Gunakan password yang kuat dan unik

🔒 **Database Password**: Jangan commit `.env` ke git! Tambahkan ke `.gitignore`

🔒 **SSL/TLS**: Untuk production, gunakan SSL untuk koneksi MySQL:
```env
DATABASE_URL=mysql+aiomysql://user:pass@host:3306/db?ssl=true
```

## Migrasi dari SQLite ke MySQL

Jika Anda sudah punya data client di SQLite lokal dan ingin migrasi ke MySQL:

1. Export data dari SQLite:
   ```bash
   # TODO: Buat script export jika diperlukan
   ```

2. Import ke MySQL:
   ```bash
   # TODO: Buat script import jika diperlukan
   ```

> Untuk saat ini, jika belum ada data penting, lebih mudah untuk setup fresh di MySQL dan daftarkan client dari awal.

## Next Steps

Setelah Central Server setup dengan database remote:

1. ✅ Setup `.env` di aplikasi tools (backend) untuk connect ke Central Server
2. ✅ Test login dari aplikasi tools ke Central Server
3. ✅ Monitor activity logs dan usage stats dari API `/api/v1/analytics`

---

**Pertanyaan?** Check dokumentasi lengkap di `MULTITENANT_SETUP.md`
