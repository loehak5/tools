# Walkthrough: Instagram Automation System

I have successfully implemented the MVP for your scalable Instagram Automation System. The system includes a FastAPI backend, a React frontend, and a PostgreSQL database, all containerized with Docker.

## Features Implemented
- **3 Login Methods**: Username/Password, 2FA, and Cookies.
- **Unique Fingerprinting**: Each account generates and persists a unique device fingerprint (UserAgent, Device Settings).
- **SSO Redirect Cleanup**: Improved the SSO handshake error handling in `SSORedirect.tsx`.
    - Prevented "Not authenticated" error messages from appearing in the URL when redirecting back to the central server.
    - Users are now gracefully redirected back to the clean origin URL if their local session is expired or missing.
- **Central Server Google Login**: Fixed functionality on the central server.
    - Updated `central-server/views/login.php` with the correct Google Client ID.
    - Fixed SQL error `1364` by adding a dummy `hashed_password` when auto-registering users via Google.
- **Auto-Login Fix**: Added CORS headers to `central-server/api/auth.php`.
    - Allows the local dashboard to securely check the central session during the login process.
    - Resolves the issue where the "Sync & Login Automatically" button was missing.

### Frontend Dashboard Enhancements
- **Dashboard**: A premium dark-mode UI to view stats and manage accounts.
- **Scalable Architecture**: Dockerized setup with Redis for background tasks (ready for thousands of accounts).

## How to Run

### Prerequisites
- Docker & Docker Compose installed.

### Steps
1. **Navigate to the project directory**:
   ```powershell
   cd c:\Users\NAR\Documents\tools-ig
   ```

2. **Start the services**:
   ```powershell
   docker-compose up --build
   ```
   *This will build the backend and worker images, and start the Database, Redis, Backend (Port 8000), and Frontend service (if added to docker-compose, currently Frontend needs local run).*

3. **Start Frontend (Local)**:
   *Since I set up the frontend to run locally for better dev experience:*
   ```powershell
   cd frontend
   npm run dev
   ```

4. **Access the Dashboard**:
   Open your browser to `http://localhost:5173`.

## Architecture Overview
- **Backend (`/backend`)**: 
  - `app/services/fingerprint_service.py`: Generates Android device profiles.
  - `app/services/instagram_service.py`: Wraps `instagrapi` to use these profiles.
  - `app/routers/accounts.py`: API to manage accounts.
- **Frontend (`/frontend`)**: 
  - React + Vite + TailwindCSS.
  - `src/api/client.ts`: Connects to localhost:8000.

## Next Steps (Phase 2)
- Implement the actual **Scheduler** logic (Celery tasks are set up but empty).
- Add **User Authentication** for the dashboard itself.
- Deploy to a VPS using the `docker-compose.yml`.
