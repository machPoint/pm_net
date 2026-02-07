@echo off
REM Docker Build Script for OPAL Server (Windows)

echo ========================================
echo OPAL Server - Docker Build Script
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

REM Get version tag (optional)
set /p VERSION="Enter version tag (press Enter for 'latest'): "
if "%VERSION%"=="" set VERSION=latest

echo.
echo Building OPAL Server Docker image...
echo Tag: opal-server:%VERSION%
echo.

REM Build the image
docker build -t opal-server:%VERSION% .

if errorlevel 1 (
    echo.
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Image: opal-server:%VERSION%
echo.
echo To run the container, use:
echo   docker-compose up -d
echo.
echo Or manually:
echo   docker run -d -p 3000:3000 -v opal-data:/data opal-server:%VERSION%
echo.

pause
