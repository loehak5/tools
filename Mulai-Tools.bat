@echo off
title Instatool All-in-One Launcher
color 0B
cls

:: Hubungi folder root agar script bisa dijalankan dari mana saja
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

echo =======================================================
echo      PROJECT INSTATOOL - AUTO UPDATE 
echo =======================================================
echo.

:: --- BAGIAN 1: UPDATE DARI GITHUB ---
echo [1/4] Mengecek update dari GitHub...
git pull origin main

if %errorlevel% neq 0 (
    echo [!] Konflik ditemukan. Mereset ke versi server...
    git fetch --all
    git reset --hard origin/main
    git pull origin main
)

:: --- BAGIAN 2: SETUP BACKEND (PYTHON) ---
echo.
echo [2/4] Menyiapkan Backend Python...
cd /d "%BASE_DIR%backend"

:: Gunakan python -m pip untuk kompatibilitas Windows
python -m pip install -r requirements.txt --quiet --disable-pip-version-check

echo     -> Menjalankan Python Service...
:: Buka backend di jendela baru agar tidak menggantung
start "Backend Server Instatool" cmd /k "cd /d %BASE_DIR%backend && python -m uvicorn app.main:app --port 8000 --host 127.0.0.1"

:: --- BAGIAN 3: SETUP FRONTEND (NODE JS) ---
echo.
echo [3/4] Menyiapkan Frontend Web...
cd /d "%BASE_DIR%frontend"

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terinstall! Web tidak bisa jalan.
    pause
    exit
)

echo     -> Mengecek/Update modul Frontend...
:: 'call' wajib digunakan agar script tidak langsung tertutup setelah npm selesai
call npm install --no-audit --no-fund

:: --- BAGIAN 4: JALANKAN WEBSERVER ---
echo.
echo [4/4] Menjalankan Web Server (npm run dev)...
echo.
echo =======================================================
echo      APLIKASI SIAP! JANGAN TUTUP JENDELA INI
echo =======================================================

call npm run dev
