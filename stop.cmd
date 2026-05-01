@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :41891 ^| findstr LISTENING') do (
  taskkill /PID %%a /F >nul 2>nul
)
echo OpenClaw Fix Desk Windows stopped (if it was running on 41891).
pause
