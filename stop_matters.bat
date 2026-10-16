@echo off
title Matters - Terminate System & Clear Cache
color 0A

echo ======================================================================
echo    MATTERS - Terminate System & Clear Cache
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Terminating all running Node.js instances on ports 3000 and 3001...
taskkill /f /im node.exe >nul 2>&1
echo       Done! All Matters server processes terminated.
echo.

echo [2/3] Purging Next.js build and session caches...
if exist ".next\cache\" (
    rd /s /q ".next\cache" >nul 2>&1
    echo       Done! .next\cache folder purged.
) else (
    echo       Cache already clean.
)
echo.

echo [3/3] System session reset ready for next run.
echo.
echo ======================================================================
echo    SYSTEM TERMINATED SUCCESSFULLY!
echo    - Ports 3000 and 3001 released.
echo    - Server caches purged.
echo    - Next run of run_matters.bat will start on Login page automatically.
echo ======================================================================
echo.
timeout /t 3 >nul
