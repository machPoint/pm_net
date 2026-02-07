@echo off
title OPAL Admin UI
echo.
echo  ██████╗ ██████╗  █████╗ ██╗         █████╗ ██████╗ ███╗   ███╗██╗███╗   ██╗
echo ██╔═══██╗██╔══██╗██╔══██╗██║        ██╔══██╗██╔══██╗████╗ ████║██║████╗  ██║
echo ██║   ██║██████╔╝███████║██║        ███████║██║  ██║██╔████╔██║██║██╔██╗ ██║
echo ██║   ██║██╔═══╝ ██╔══██║██║        ██╔══██║██║  ██║██║╚██╔╝██║██║██║╚██╗██║
echo ╚██████╔╝██║     ██║  ██║███████╗   ██║  ██║██████╔╝██║ ╚═╝ ██║██║██║ ╚████║
echo  ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚══════╝   ╚═╝  ╚═╝╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝
echo.
echo                            MCP Server Admin Interface
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js version: 
node --version
echo.

REM Change to UI directory
cd ui

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies with legacy peer deps support...
    echo This may take a few minutes...
    echo.
    npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo.
        echo WARNING: npm install had issues, trying with --force...
        npm install --force
    )
    echo.
)

REM Set environment variables
set NODE_NO_WARNINGS=1
set NEXT_TELEMETRY_DISABLED=1

REM Start the admin interface
echo Starting OPAL Admin Interface...
echo.
echo  • Admin UI: http://localhost:3000
echo  • OPAL Server: http://localhost:3001 (if running)
echo.
echo Press Ctrl+C to stop the server
echo.

start "OPAL Admin" http://localhost:3000
npm run dev

pause