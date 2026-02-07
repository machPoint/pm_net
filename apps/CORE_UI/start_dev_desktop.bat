@echo off
setlocal enabledelayedexpansion
title CORE-SE Desktop Dev Launcher
color 0A

echo ===============================================
echo    CORE-SE Desktop Development Mode
echo ===============================================
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Rust/Cargo not found. Please install from https://rustup.rs/
    pause
    exit /b 1
)

REM Set desktop mode environment
set MODE=desktop
set BACKEND_HOST=127.0.0.1
set BACKEND_PORT=8000
set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000

echo.
echo [1/4] Starting FastAPI Backend...
echo -----------------------------------------------
cd /d "%~dp0backend"
start "CORE-SE Backend" cmd /k "python start_backend.py"
timeout /t 3 /nobreak >nul

echo.
echo [2/4] Starting Next.js Dev Server...
echo -----------------------------------------------
cd /d "%~dp0frontend"
start "CORE-SE Frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Optional: Start FDS for Demo Data?
echo -----------------------------------------------
set /p START_FDS="Start Fake Data Service? (y/N): "
if /i "%START_FDS%"=="y" (
    cd /d "%~dp0..\FDS"
    if exist "start_fds.py" (
        start "CORE-SE FDS" cmd /k "python start_fds.py"
        set FDS_BASE_URL=http://localhost:4000
        timeout /t 3 /nobreak >nul
        echo FDS started on port 4000
    ) else (
        echo [WARNING] FDS not found at ..\FDS\start_fds.py
    )
) else (
    echo Skipping FDS...
)

echo.
echo [4/4] Launching Tauri Desktop App...
echo -----------------------------------------------
cd /d "%~dp0desktop"

REM Install npm dependencies if needed
if not exist "node_modules" (
    echo Installing desktop dependencies...
    call npm install
)

echo Starting Tauri dev mode...
echo.
echo ===============================================
echo   CORE-SE Desktop is starting...
echo ===============================================
echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000 (via Tauri)
echo FDS:      %FDS_BASE_URL%
echo.
echo Press Ctrl+C in the Tauri window to stop.
echo ===============================================
echo.

REM Run Tauri dev (this will block until closed)
call npm run dev

echo.
echo Desktop app closed.
echo Please close other terminal windows manually.
pause
