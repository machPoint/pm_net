@echo off
REM Docker Run Script for OPAL Server (Windows)

echo ========================================
echo OPAL Server - Docker Run Script
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running...
echo.

REM Check if .env file exists
if not exist .env (
    echo WARNING: .env file not found!
    echo.
    if exist .env.docker.example (
        echo Creating .env from .env.docker.example...
        copy .env.docker.example .env
        echo.
        echo Please edit .env file with your configuration.
        echo Then run this script again.
        pause
        exit /b 0
    ) else (
        echo ERROR: .env.docker.example not found!
        echo Please create a .env file manually.
        pause
        exit /b 1
    )
)

echo Using docker-compose to start OPAL server...
echo.

REM Start with docker-compose
docker-compose up -d

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start container!
    pause
    exit /b 1
)

echo.
echo ========================================
echo OPAL Server started successfully!
echo ========================================
echo.
echo Server is running at: http://localhost:3000
echo Admin panel: http://localhost:3000/admin
echo.
echo Useful commands:
echo   View logs:    docker-compose logs -f opal-server
echo   Stop server:  docker-compose down
echo   Restart:      docker-compose restart
echo.

REM Wait a few seconds for server to start
timeout /t 3 /nobreak >nul

REM Check if server is responding
echo Checking server health...
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: Server may not be ready yet.
    echo Check logs with: docker-compose logs -f opal-server
) else (
    echo Server is healthy!
)

echo.
pause
