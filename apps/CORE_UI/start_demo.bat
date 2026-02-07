@echo off
REM ====================================================================
REM  CORE-SE Demo Mode Launcher
REM  Starts: Frontend Only (Port 3000) - No Server Dependencies
REM  Uses: Fake Data Mode (Static or Streaming)
REM ====================================================================

color 0C
echo.
echo ====================================================================
echo  CORE-SE Demo Mode - Frontend Only
echo  No OPAL or FDS servers required!
echo ====================================================================
echo.

REM Check if frontend folder exists
echo [*] Checking project structure...
if not exist "C:\Users\X1\PROJECT\CORE_SE\frontend" (
    echo [ERROR] Frontend folder not found at C:\Users\X1\PROJECT\CORE_SE\frontend
    echo Please ensure the frontend project exists
    pause
    exit /b 1
)
echo [OK] Frontend folder found
echo.

REM Kill any existing process on port 3000
echo [*] Cleaning up port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul
echo [OK] Port 3000 cleared
echo.

echo ====================================================================
echo  Starting Frontend in Demo Mode
echo ====================================================================
echo.
echo  [*] Starting Core Frontend on port 3000...
echo.
echo  TIP: The app will use FAKE DATA by default
echo       Go to Admin -^> Data Management to switch modes:
echo       - Static Fake Data (default)
echo       - Streaming Fake Data (live updates)
echo       - Real Data (requires OPAL + FDS servers)
echo.

REM Start the frontend
start "CORE-SE Demo" /D "C:\Users\X1\PROJECT\CORE_SE\frontend" cmd /k "color 0C && title CORE-SE Demo - Port 3000 && npm run dev"

echo [*] Frontend starting...
echo.
echo ====================================================================
echo  Opening Dashboard in 8 seconds...
echo ====================================================================
echo.

timeout /t 8 /nobreak

REM Open browser
echo [*] Opening http://localhost:3000
start http://localhost:3000

echo.
echo ====================================================================
echo  DEMO MODE RUNNING
echo ====================================================================
echo.
echo  Dashboard:  http://localhost:3000
echo.
echo  DEMO FEATURES:
echo  - No server dependencies required
echo  - Uses pre-generated fake data
echo  - Switch to Streaming mode for live updates
echo  - Perfect for offline presentations
echo.
echo  To switch data modes:
echo  1. Navigate to Admin section
echo  2. Click Data Management tab
echo  3. Select your preferred mode
echo.
echo ====================================================================
echo  Press any key to stop the demo...
echo ====================================================================
pause >nul

REM Cleanup
echo.
echo [*] Stopping frontend...
taskkill /FI "WindowTitle eq CORE-SE Demo*" /F >nul 2>&1

echo [OK] Demo stopped
echo.
echo Thanks for using CORE-SE Demo Mode!
timeout /t 2 /nobreak >nul
