@echo off
REM ==================================================
REM  Net PM Core Master Startup Script
REM  Starts OPAL_SE and CORE_UI in parallel
REM ==================================================

echo.
echo ========================================
echo  Net PM Core System Startup
echo ========================================
echo.
echo Starting all services:
echo   1. OPAL_SE Server - Port 7788
echo   2. CORE_UI Backend - Port 8000
echo   3. CORE_UI Frontend - Port 3000
echo.

echo ========================================
echo  Cleaning up old processes...
echo ========================================
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
echo [✓] Old processes cleaned up
echo.

REM Change to the root directory
cd /d "%~dp0"

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

REM Check if Python is available
set PYTHON_PATH=C:\Users\X1\AppData\Local\Programs\Python\Python312\python.exe
if not exist "%PYTHON_PATH%" (
    echo ERROR: Python is not installed at expected location
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

echo [✓] Node.js detected
echo [✓] Python detected
echo.

REM Check if required directories exist
if not exist "apps\OPAL_SE" (
    echo ERROR: apps\OPAL_SE directory not found
    pause
    exit /b 1
)

if not exist "apps\CORE_UI\frontend" (
    echo ERROR: apps\CORE_UI\frontend directory not found
    pause
    exit /b 1
)

if not exist "apps\CORE_UI\backend" (
    echo ERROR: apps\CORE_UI\backend directory not found
    pause
    exit /b 1
)

echo [✓] All directories found
echo.

REM Check and install dependencies if needed
echo ========================================
echo  Checking Dependencies
echo ========================================
echo.

REM Check OPAL_SE dependencies
if not exist "apps\OPAL_SE\node_modules" (
    echo [!] Installing OPAL_SE dependencies...
    cd /d "%~dp0apps\OPAL_SE"
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install OPAL_SE dependencies
        pause
        exit /b 1
    )
    cd /d "%~dp0"
    echo [✓] OPAL_SE dependencies installed
) else (
    echo [✓] OPAL_SE dependencies found
)

REM Check CORE_UI Frontend dependencies
if not exist "apps\CORE_UI\frontend\node_modules" (
    echo [!] Installing CORE_UI Frontend dependencies...
    cd /d "%~dp0apps\CORE_UI\frontend"
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install CORE_UI Frontend dependencies
        pause
        exit /b 1
    )
    cd /d "%~dp0"
    echo [✓] CORE_UI Frontend dependencies installed
) else (
    echo [✓] CORE_UI Frontend dependencies found
)

echo.
echo ========================================
echo  Starting Services (in new windows)
echo ========================================
echo.

REM Start OPAL_SE in a new window (run migrations first, then dev mode)
echo [1/3] Starting OPAL_SE Server...
start "OPAL_SE Server (Port 7788)" cmd /k "cd /d "%~dp0apps\OPAL_SE" && echo Starting OPAL_SE Server... && npm run migrate && npm run dev"
timeout /t 3 /nobreak >nul

REM Start CORE_UI Backend in a new window
echo [2/3] Starting CORE_UI Backend...
start "CORE_UI Backend (Port 8000)" cmd /k "cd /d "%~dp0" && call core-se-env\Scripts\activate.bat && cd apps\CORE_UI\backend && echo Starting CORE_UI Backend... && "%~dp0core-se-env\Scripts\python.exe" start_backend.py"
timeout /t 3 /nobreak >nul

REM Start CORE_UI Frontend in a new window
echo [3/3] Starting CORE_UI Frontend...
start "CORE_UI Frontend (Port 3000)" cmd /k "cd /d "%~dp0apps\CORE_UI\frontend" && echo Starting CORE_UI Frontend... && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  All Services Started!
echo ========================================
echo.
echo Three new windows have been opened:
echo.
echo   🔧 OPAL_SE Server:      http://localhost:7788
echo      Admin Panel:         http://localhost:7788/admin
echo      Graph API:           http://localhost:7788/api/nodes
echo.
echo   🔌 CORE_UI Backend:     http://localhost:8000
echo      Health Check:        http://localhost:8000/health
echo      API Docs:            http://localhost:8000/docs
echo.
echo   🌐 CORE_UI Frontend:    http://localhost:3000
echo      Governance:          http://localhost:3000/governance
echo.
echo ========================================
echo  Waiting for Services to Initialize
echo ========================================
echo.
echo Please wait 10-15 seconds for all services to start...
echo.
timeout /t 5 /nobreak >nul

echo Checking service status...
echo.

REM Optional: Open browser to CORE_UI
echo Would you like to open CORE_UI in your browser?
echo.
choice /C YN /M "Open http://localhost:3000"
if errorlevel 2 goto :skip_browser
if errorlevel 1 (
    echo.
    echo Opening CORE_UI in your default browser...
    timeout /t 3 /nobreak >nul
    start http://localhost:3000
)
:skip_browser

echo.
echo ========================================
echo  Quick Reference
echo ========================================
echo.
echo To stop all services:
echo   - Close each window manually, OR
echo   - Press Ctrl+C in each window
echo.
echo To restart a specific service:
echo   - Close its window
echo   - Run the appropriate start script:
echo     * OPAL_SE:          cd apps\OPAL_SE ^&^& npm run migrate ^&^& npm run dev
echo     * CORE_UI Backend:  cd apps\CORE_UI\backend ^&^& python start_backend.py
echo     * CORE_UI Frontend: cd apps\CORE_UI\frontend ^&^& npm run dev
echo.
echo ========================================
echo  System Ready!
echo ========================================
echo.
echo All services are starting up in separate windows.
echo Check each window for startup progress.
echo.
echo This window can be closed once all services are running.
echo.
pause

