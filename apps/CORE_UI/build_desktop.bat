@echo off
setlocal enabledelayedexpansion
title CORE-SE Desktop Build
color 0B

echo ===============================================
echo    CORE-SE Desktop Build Process
echo ===============================================
echo.

REM Check prerequisites
echo [STEP 1] Checking prerequisites...
echo -----------------------------------------------

where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Rust/Cargo not found. Install from https://rustup.rs/
    pause
    exit /b 1
)
echo [OK] Rust/Cargo found

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found
echo.

REM Build frontend for desktop
echo [STEP 2] Building Next.js frontend for desktop...
echo -----------------------------------------------
cd /d "%~dp0frontend"

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Frontend npm install failed
        pause
        exit /b 1
    )
)

REM Build with desktop export mode
echo Building Next.js with static export...
call npm run build:desktop
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)
echo [OK] Frontend built to out/
echo.

REM Prepare desktop app
echo [STEP 3] Preparing Tauri desktop app...
echo -----------------------------------------------
cd /d "%~dp0desktop"

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing desktop dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Desktop npm install failed
        pause
        exit /b 1
    )
)
echo [OK] Desktop dependencies ready
echo.

REM Check for app icons
if not exist "src-tauri\icons\icon.ico" (
    echo [WARNING] App icons not found in src-tauri\icons\
    echo [WARNING] You may need to generate icons with:
    echo [WARNING]   cd desktop
    echo [WARNING]   npx @tauri-apps/cli icon path/to/source-icon.png
    echo.
    set /p CONTINUE="Continue without icons? Build may fail. (y/N): "
    if /i not "!CONTINUE!"=="y" (
        echo Build cancelled.
        pause
        exit /b 1
    )
)

REM Build Tauri app
echo [STEP 4] Building Tauri executable...
echo -----------------------------------------------
echo This may take several minutes...
echo.

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Tauri build failed
    pause
    exit /b 1
)

echo.
echo ===============================================
echo   Build Complete!
echo ===============================================
echo.
echo Installer location:
echo   desktop\src-tauri\target\release\bundle\
echo.
echo You can find:
echo   - Windows: .msi or .exe installer
echo   - Portable: Executable in target\release\
echo.
pause
