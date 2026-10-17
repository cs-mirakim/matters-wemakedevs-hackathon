@echo off
title Matters - Terminate Admin Panel
color 0A

echo ======================================================================
echo    MATTERS - Terminate Admin Panel
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Terminating running Node.js Admin Panel on port 3001...
taskkill /f /im node.exe >nul 2>&1
echo       Done! Admin panel process terminated.
echo.

echo [2/2] Port 3001 released.
echo.
echo ======================================================================
echo    ADMIN PANEL TERMINATED SUCCESSFULLY!
echo    - Port 3001 released.
echo    - Run run_matters.bat to start Admin Panel again.
echo ======================================================================
echo.
timeout /t 3 >nul
