@echo off
setlocal enabledelayedexpansion

:: --- CONFIGURATION ---
set "REPO_DIR=%~dp0.."
set "LOG_FILE=%REPO_DIR%\scripts\maintenance.log"
set "UPDATE_INTERVAL=900"

:loop
echo %DATE% %TIME% - Checking for updates... >> "%LOG_FILE%"

cd /d "%REPO_DIR%"

:: check internet
ping -n 1 github.com >nul 2>&1
if %errorlevel% equ 0 (
    git fetch --all >> "%LOG_FILE%" 2>&1
    git reset --hard origin/main >> "%LOG_FILE%" 2>&1
    
    if %errorlevel% equ 0 (
        echo %DATE% %TIME% - Update successful / No new updates. >> "%LOG_FILE%"
    else (
        echo %DATE% %TIME% - Update failed. Check Git status. >> "%LOG_FILE%"
    )
) else (
    echo %DATE% %TIME% - No internet connection. >> "%LOG_FILE%"
)

timeout /t %UPDATE_INTERVAL% /nobreak >nul
goto loop
