#!/bin/bash

# --- CONFIGURATION ---
cd "$(dirname "$0")"
REPO_DIR=$(pwd)
PLIST_NAME="com.instatools.maintenance.plist"
PLIST_SRC="$REPO_DIR/scripts/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

clear
echo "======================================================="
echo "      INSTATOOL - AKTIVASI MAINTENANCE MODE"
echo "======================================================="
echo ""

# 1. Pastikan script executable
chmod +x "$REPO_DIR/scripts/maintenance_updater.sh"
chmod +x "$REPO_DIR/Mulai-Tools.command"

# 2. Update Path di dalam plist (karena launchd butuh Absolute Path)
echo "[1/3] Mengatur jalur sistem..."
sed -i '' "s|/Users/apink/Documents/web/project-tools/instatools|$REPO_DIR|g" "$PLIST_SRC"

# 3. Pasang ke LaunchAgents
echo "[2/3] Memasang service latar belakang..."
cp "$PLIST_SRC" "$PLIST_DEST"

# 4. Aktifkan Service
echo "[3/3] Menjalankan Maintenance Service..."
launchctl unload "$PLIST_DEST" 2>/dev/null
launchctl load "$PLIST_DEST"

echo ""
echo "======================================================="
echo "  BERHASIL! MAINTENANCE MODE TELAH AKTIF."
echo "  Project akan terupdate otomatis di latar belakang."
echo "  Anda bisa menutup jendela terminal ini."
echo "======================================================="
echo ""
read -p "Tekan [Enter] untuk keluar..."
