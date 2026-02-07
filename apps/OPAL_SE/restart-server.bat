@echo off
echo Stopping OPAL server...

REM Kill any running node processes for this project
taskkill /F /IM node.exe /FI "WINDOWTITLE eq*OPAL*" 2>nul
taskkill /F /IM tsx.exe 2>nul

REM Wait a moment for processes to fully terminate
timeout /t 2 /nobreak >nul

echo Starting OPAL server...
start "OPAL Server" cmd /k "npm run dev"

echo.
echo OPAL server is starting in a new window...
echo Press any key to exit this window.
pause >nul
