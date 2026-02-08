@echo off
title Instatool All-in-One Launcher
color 0B
cls

echo =======================================================
echo      PROJECT INSTATOOL - AUTO UPDATE & START
echo =======================================================
echo.

:: --- BAGIAN 1: UPDATE DARI GITHUB ---
echo [1/4] Mengecek update dari GitHub...
git pull origin main

:: Jika ada konflik, reset paksa (Opsional, hapus block if ini jika tidak ingin force reset)
if %errorlevel% neq 0 (
    echo [!] Konflik ditemukan. Mereset ke versi server...
    git fetch --all
    git reset --hard origin/main
    git pull origin main
)

:: --- BAGIAN 2: SETUP BACKEND (PYTHON) ---
echo.
echo [2/4] Menyiapkan Backend Python...
cd backend

:: Install library python jika ada yang baru
pip install -r requirements.txt --quiet --disable-pip-version-check

:: Jalankan Python di JENDELA BARU (agar tidak memblokir script)
:: "start" akan membuka CMD baru berjudul "Backend Server"
echo     -> Menjalankan Python Service...
start "Backend Server Instatool" cmd /k "python3 -m uvicorn app.main:app --port 8000 --host 127.0.0.1"


:: --- BAGIAN 3: SETUP FRONTEND (NODE JS) ---
echo.
echo [3/4] Menyiapkan Frontend Web...
cd frontend

:: Cek apakah user punya Node.js
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terinstall! Web tidak bisa jalan.
    pause
    exit
)

:: Install dependency npm jika package.json berubah
:: Gunakan 'call' agar batch script tidak berhenti setelah npm install
echo     -> Menginstall/Update modul Frontend (tunggu sebentar)...
call npm install --silent

:: --- BAGIAN 4: JALANKAN WEBSERVER ---
echo.
echo [4/4] Menjalankan Web Server (npm run dev)...
echo.
echo =======================================================
echo      APLIKASI SIAP! JANGAN TUTUP JENDELA INI
echo =======================================================

:: Jalankan server dev
npm run dev