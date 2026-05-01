@echo off
setlocal
cd /d "%~dp0"
set PORT=41891
start "OpenClaw Fix Desk Windows" cmd /c "node src\server.mjs"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:%PORT%'"
endlocal
