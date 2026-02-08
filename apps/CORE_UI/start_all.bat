@echo off
REM ====================================================================
REM  CORE-SE Full Stack Launcher
REM  Starts: FDS (Port 4000) → OPAL (Port 3001) → Core Backend (Port 8000) → Core Frontend (Port 3000)
REM ====================================================================

color 0A
echo.
echo ====================================================================
echo  CORE-SE Full Stack Development Environment
echo  Starting: FDS + OPAL + Backend + Frontend
echo ====================================================================
echo.

REM Check if all project folders exist
echo [*] Checking project structure...
if not exist "C:\Users\X1\PROJECT\FDS" (
    echo [ERROR] FDS folder not found at C:\Users\X1\PROJECT\FDS
    echo Please ensure all projects are in C:\Users\X1\PROJECT\
    pause
    exit /b 1
)

if not exist "C:\Users\X1\PROJECT\OPAL" (
    echo [ERROR] OPAL folder not found at C:\Users\X1\PROJECT\OPAL
    echo Please ensure all projects are in C:\Users\X1\PROJECT\
    pause
    exit /b 1
)

if not exist "C:\Users\X1\PROJECT\CORE_SE" (
    echo [ERROR] CORE_SE folder not found at C:\Users\X1\PROJECT\CORE_SE
    echo Please ensure all projects are in C:\Users\X1\PROJECT\
    pause
    exit /b 1
)

echo [OK] All project folders found
echo.

REM Kill any existing processes on our ports
echo [*] Cleaning up any existing services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] Ports cleared
echo.

echo ====================================================================
echo  Starting Services (This takes ~15 seconds)
echo ====================================================================
echo.

REM 1. Start FDS (Fake Data Server)
echo [1/4] Starting FDS (Fake Data Server)...
echo       Port: 4000
echo       Admin: http://localhost:4000/admin
start "FDS Server" /D "C:\Users\X1\PROJECT\FDS" cmd /k "color 0E && title FDS Server - Port 4000 && python start_fds.py"
timeout /t 4 /nobreak >nul

REM Verify FDS started
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do set FDS_RUNNING=1
if not defined FDS_RUNNING (
    echo [ERROR] FDS failed to start on port 4000
    pause
    exit /b 1
)
echo [OK] FDS running on port 4000
echo.

REM 2. Start OPAL MCP Server
echo [2/4] Starting OPAL MCP Server...
echo       Port: 3001
echo       Connecting to: FDS (Port 4000)
start "OPAL Server" /D "C:\Users\X1\PROJECT\OPAL" cmd /k "color 0B && title OPAL MCP Server - Port 3001 && npm start"
timeout /t 6 /nobreak >nul

REM Verify OPAL started
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do set OPAL_RUNNING=1
if not defined OPAL_RUNNING (
    echo [WARNING] OPAL may not be running on port 3001
    echo [INFO] Check the OPAL window for errors
)
echo [OK] OPAL MCP Server starting on port 3001
echo.

REM 3. Start Core Backend
echo [3/4] Starting Core Backend...
echo       Port: 8000
echo       Connecting to: OPAL (Port 3001)
if exist "C:\Users\X1\PROJECT\CORE_SE\backend" (
    start "Core Backend" /D "C:\Users\X1\PROJECT\CORE_SE\backend" cmd /k "color 0D && title Core Backend - Port 8000 && python start_backend.py"
    timeout /t 4 /nobreak >nul
    echo [OK] Core Backend starting on port 8000
) else (
    echo [WARNING] Core backend folder not found
    echo [INFO] You may need to create C:\Users\X1\PROJECT\CORE_SE\backend
)
echo.

REM 4. Start Core Frontend
echo [4/4] Starting Core Frontend...
echo       Port: 3000
echo       Connecting to: Core Backend (Port 8000)
if exist "C:\Users\X1\PROJECT\CORE_SE\frontend" (
    start "Core Frontend" /D "C:\Users\X1\PROJECT\CORE_SE\frontend" cmd /k "color 0C && title Core Frontend - Port 3000 && npm run dev"
    timeout /t 3 /nobreak >nul
    echo [OK] Core Frontend starting on port 3000
) else (
    echo [WARNING] Core frontend folder not found  
    echo [INFO] You may need to create C:\Users\X1\PROJECT\CORE_SE\frontend
)
echo.

REM Display status
echo ====================================================================
echo  Services Starting... Please Wait
echo ====================================================================
echo.
echo  Opening in 10 seconds...
echo.
echo  [FDS]      http://localhost:4000/admin
echo  [OPAL]     http://localhost:3001  
echo  [Backend]  http://localhost:8000
echo  [Frontend] http://localhost:3000
echo.
echo ====================================================================
echo  Window Management:
echo ====================================================================
echo  - Each service runs in its own window
echo  - Close ANY window to stop that service
echo  - Press Ctrl+C in any window to stop
echo  - Close this window last to keep them all running
echo ====================================================================
echo.

timeout /t 10 /nobreak

REM Open browsers
echo [*] Opening dashboard...
start http://localhost:3000
timeout /t 2 /nobreak >nul
start http://localhost:4000/admin

echo.
echo ====================================================================
echo  ALL SERVICES RUNNING
echo ====================================================================
echo.
echo  Core Dashboard:  http://localhost:3000
echo  FDS Admin:       http://localhost:4000/admin
echo.
echo  Press any key to stop all services...
echo ====================================================================
pause >nul

REM Cleanup
echo.
echo [*] Stopping all services...
taskkill /FI "WindowTitle eq FDS Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq OPAL Server*" /F >nul 2>&1  
taskkill /FI "WindowTitle eq Core Backend*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Core Frontend*" /F >nul 2>&1

echo [OK] All services stopped
echo.
echo Goodbye!
timeout /t 2 /nobreak >nul