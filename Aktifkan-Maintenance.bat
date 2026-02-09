@echo off
setlocal enabledelayedexpansion

:: --- CONFIGURATION ---
set "REPO_DIR=%~dp0"
set "UPDATER_BAT=%REPO_DIR%scripts\maintenance_updater.bat"
set "SILENT_VBS=%REPO_DIR%scripts\silent_run.vbs"
set "TASK_NAME=InstatoolsMaintenance"

cls
echo =======================================================
echo      INSTATOOL - AKTIVASI MAINTENANCE MODE
echo =======================================================
echo.

:: 1. Cek Git
echo [1/3] Mengecek sistem...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git tidak ditemukan! Update otomatis tidak bisa jalan.
    pause
    exit
)

:: 2. Daftarkan Scheduled Task
echo [2/3] Memasang service latar belakang...
:: Hapus jika sudah ada
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: Buat task baru yang jalan saat login
:: Kita jalankan melalui wscript agar silent
schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%SILENT_VBS%\" \"%UPDATER_BAT%\"" /sc onlogon /rl highest /f

:: 3. Jalankan sekarang juga
echo [3/3] Menjalankan Maintenance Service pertama kali...
schtasks /run /tn "%TASK_NAME%"

echo.
echo =======================================================
echo  BERHASIL! MAINTENANCE MODE TELAH AKTIF.
echo  Project akan terupdate otomatis di latar belakang.
echo  Anda bisa menutup jendela ini.
echo =======================================================
echo.
pause
