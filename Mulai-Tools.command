#!/bin/bash

# --- BAGIAN 0: SET FOLDER ROOT ---
# Perintah sakti pengganti %~dp0 di Mac
cd "$(dirname "$0")"
CLEAR_CMD="clear"

echo "======================================================="
echo "      PROJECT INSTATOOL - MAC OS LAUNCHER"
echo "======================================================="
echo ""

# --- BAGIAN 1: UPDATE DARI GITHUB ---
echo "[1/4] Mengecek update dari GitHub..."
git pull origin main

# Cek jika error (Conflict), lakukan reset paksa
if [ $? -ne 0 ]; then
    echo "[!] Konflik ditemukan. Mereset ke versi server..."
    git fetch --all
    git reset --hard origin/main
    git pull origin main
fi

# --- BAGIAN 2: SETUP BACKEND (PYTHON) ---
echo ""
echo "[2/4] Menyiapkan Backend Python..."
cd backend

# Install dependencies
pip3 install -r requirements.txt --quiet --disable-pip-version-check

# Jalankan Python di JENDELA TERMINAL BARU (AppleScript)
# Ini pengganti perintah "start" di Windows
echo "    -> Membuka Terminal baru untuk Backend..."
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && python3 -m uvicorn app.main:app --port 8000 --host 127.0.0.1"'

# --- BAGIAN 3: SETUP FRONTEND (NODE JS) ---
# Kembali ke Root dulu
cd ..

echo ""
echo "[3/4] Menyiapkan Frontend Web..."
cd frontend

# Cek Node JS
if ! command -v npm &> /dev/null
then
    echo "[ERROR] Node.js belum terinstall! Web tidak bisa jalan."
    exit
fi

# Install modul Frontend
echo "    -> Menginstall/Update modul Frontend..."
npm install --silent

# --- BAGIAN 4: JALANKAN WEBSERVER ---
echo ""
echo "[4/4] Menjalankan Web Server (npm run dev)..."
echo ""
echo "======================================================="
echo "      APLIKASI SIAP! JANGAN TUTUP JENDELA INI"
echo "======================================================="

# Jalankan server dev
npm run dev