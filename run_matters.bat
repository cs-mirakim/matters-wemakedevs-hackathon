@echo off
title Matters - Multi-Agent Memory & Admin System
color 0B

echo ======================================================================
echo    MATTERS - Because what people say, Matters
echo    Track: Agent Memory and Coordination (FalkorDB Graph Hacks)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check and install dependencies if missing
if not exist "node_modules\" (
    echo [1/5] Installing project dependencies...
    call npm install
    echo.
) else (
    echo [1/5] Dependencies verified!
)

:: 2. Purge stale Next.js cache and temporary artifacts to prevent session contamination
echo [2/5] Purging stale compilation and session caches...
if exist ".next\cache\" rd /s /q ".next\cache" >nul 2>&1

:: 3. Terminate any lingering node instances to free ports 3000 and 3001
echo [3/5] Freeing ports 3000 and 3001...
taskkill /f /im node.exe >nul 2>&1

:: 4. Start Standalone Admin Panel on Port 3001 in a separate background window
echo [4/5] Launching Matters Admin Panel (Port 3001)...
start "Matters Admin Panel [Port 3001]" cmd /k "cd /d "%~dp0admin" && node --env-file=../.env.local server.js"

:: 5. Trigger browser to open Login Page (Clean First Landing) and Admin Panel after 3s
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000/login & start http://localhost:3001"

echo [5/5] Starting Next.js development server on http://localhost:3000...
echo.
echo ======================================================================
echo    Main App (Login): http://localhost:3000/login
echo    Admin Panel:      http://localhost:3001
echo    Auto-Logout:      Active (Session cache purged on every restart)
echo    Press Ctrl + C or run stop_matters.bat to terminate services.
echo ======================================================================
echo.

call npm run dev
pause
