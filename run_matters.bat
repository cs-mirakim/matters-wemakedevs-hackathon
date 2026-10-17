@echo off
title Matters - Standalone FalkorDB Admin Panel
color 0B

echo ======================================================================
echo    MATTERS - Standalone Admin & FalkorDB Monitor
echo    Track: Agent Memory and Coordination (FalkorDB Graph Hacks)
echo    Production Web App: https://matters-wemakedevs-hackathon.vercel.app
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check and install dependencies if missing
if not exist "node_modules\" (
    echo [1/3] Installing project dependencies...
    call npm install
    echo.
) else (
    echo [1/3] Dependencies verified!
)

:: 2. Terminate lingering node instances to free port 3001
echo [2/3] Freeing port 3001...
taskkill /f /im node.exe >nul 2>&1

:: 3. Open browser to Admin Panel after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3001"

echo [3/3] Launching FalkorDB Admin Panel on http://localhost:3001...
echo.
echo ======================================================================
echo    Admin Panel:   http://localhost:3001
echo    Vercel App:    https://matters-wemakedevs-hackathon.vercel.app
echo.
echo    Press Ctrl + C or run stop_matters.bat to terminate Admin Panel.
echo ======================================================================
echo.

cd /d "%~dp0admin"
node --env-file=../.env.local server.js
pause
