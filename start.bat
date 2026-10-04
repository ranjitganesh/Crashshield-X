@echo off
title CrashShield X - Patent Monitoring System Launcher
echo ===============================================================================
echo   CRASHSHIELD X: Resource-Transition Graph Adaptive Process Instability Detection
echo ===============================================================================
echo.

echo Starting CrashShield X FastAPI Backend (Port 8000)...
start "CrashShield X Backend" cmd /k "cd /d %~dp0backend && set PYTHONPATH=%~dp0 && python run.py"

echo Starting CrashShield X React Frontend (Port 5173)...
start "CrashShield X Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===============================================================================
echo   System launched successfully!
echo   Dashboard UI:      http://localhost:5173
echo   Backend API Docs:  http://localhost:8000/docs
echo   WebSocket Stream:  ws://localhost:8000/ws
echo ===============================================================================
pause
