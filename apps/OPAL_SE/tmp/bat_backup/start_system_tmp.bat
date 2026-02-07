@echo off
setlocal enabledelayedexpansion
title OPAL Complete System
color 0A

echo.
echo ==========================================
echo    OPAL MCP Server + Admin UI Starter
echo ==========================================
echo.

REM Check if Node.js is installed
echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version
echo.

REM Check if we're in the right directory
echo [2/4] Checking OPAL directory...
if not exist "src\server.js" (
    echo ❌ ERROR: Cannot find OPAL server files
    echo Make sure you're running this from the OPAL root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

if not exist "admin\ui\package.json" (
    echo ❌ ERROR: Cannot find Admin UI files
    echo Admin UI directory seems to be missing
    pause
    exit /b 1
)

echo ✅ OPAL files found
echo.

REM Install server dependencies
echo [3/4] Installing dependencies...
echo Installing OPAL server dependencies...
call npm install --silent --no-progress 2>nul
if %errorlevel% neq 0 (
    echo ❌ Failed to install server dependencies
    echo Trying with legacy peer deps...
    call npm install --legacy-peer-deps --silent --no-progress 2>nul
)

echo Installing Admin UI dependencies...
pushd admin\ui
call npm install --silent --no-progress --legacy-peer-deps 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Admin UI dependencies had issues, trying with --force...
    call npm install --force --silent --no-progress 2>nul
)
popd

echo ✅ Dependencies installed
echo.

REM Start services
echo [4/4] Starting services...
echo.
echo   🔹 OPAL Server:     http://localhost:3001
echo   🔹 Admin UI:        http://localhost:3000
echo   🔹 MCP Endpoint:    http://localhost:3001/mcp
echo.

REM Start OPAL server in background
echo Starting OPAL MCP Server...
set NODE_NO_WARNINGS=1
start /min "OPAL Server" cmd /k "cd /d %CD% && node src/server.js"

REM Wait for server to start
echo Waiting for server to initialize...
timeout /t 3 /nobreak >nul

REM Start Admin UI
echo Starting Admin UI...
pushd admin\ui
set NEXT_TELEMETRY_DISABLED=1
start /min "OPAL Admin UI" cmd /k "npm run dev"
popd

REM Wait for UI to start
timeout /t 2 /nobreak >nul

echo.
echo 🎉 OPAL Complete System is starting up!
echo.
echo Both services are starting in background windows.
echo The Admin UI should open automatically in your browser.
echo.
echo Press any key to stop all services...
pause >nul

REM Stop services
echo.
echo 🛑 Stopping all services...
taskkill /f /im node.exe >nul 2>&1
echo ✅ All services stopped.
pause