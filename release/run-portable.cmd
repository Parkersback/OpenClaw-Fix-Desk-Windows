@echo off
setlocal
set "APPDIR=%LOCALAPPDATA%\OpenClaw-Fix-Desk-Windows"
if not exist "%APPDIR%" mkdir "%APPDIR%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%~dp0OpenClaw-Fix-Desk-Windows-Portable.zip' -DestinationPath '%APPDIR%' -Force"
start "" "%APPDIR%\launch-hidden.vbs"
exit /b 0
