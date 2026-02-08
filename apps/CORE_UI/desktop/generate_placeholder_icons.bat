@echo off
echo ===============================================
echo    Generating Placeholder Icons for CORE-SE
echo ===============================================
echo.
echo This will create simple placeholder icons.
echo For production, replace with actual branded icons.
echo.
pause

cd /d "%~dp0"

echo Installing @tauri-apps/cli if needed...
call npm list @tauri-apps/cli >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing @tauri-apps/cli...
    call npm install --save-dev @tauri-apps/cli
)

echo.
echo Checking for icon source files...
echo.

REM Check if a source icon already exists
if exist "icon-source.png" (
    echo Found icon-source.png, generating icons from it...
    call npx @tauri-apps/cli icon icon-source.png
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✓ Icons generated successfully!
        echo.
        goto :success
    ) else (
        echo.
        echo × Icon generation failed
        echo.
        goto :manual
    )
)

echo No icon-source.png found.
echo.
echo To generate icons, you need a 1024x1024 PNG image.
echo.
echo Options:
echo   1. Place your icon as 'icon-source.png' in this directory
echo   2. Run: npx @tauri-apps/cli icon path/to/your-icon.png
echo   3. Download a placeholder from https://placeholder.com or similar
echo.

:manual
echo.
echo ===============================================
echo Manual Icon Generation
echo ===============================================
echo.
echo Create or download a 1024x1024 PNG icon, then run:
echo.
echo   npx @tauri-apps/cli icon path/to/icon.png
echo.
echo The icon will be automatically sized and converted
echo to all required formats (.ico, .icns, various PNGs).
echo.

:success
pause
