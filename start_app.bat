@echo off
echo =========================================
echo Starting DNF Trading Application...
echo =========================================

echo [1/2] Starting Backend API...
start cmd /k "cd backend && .\venv\Scripts\activate && uvicorn main:app --reload"

echo [2/2] Starting Frontend Vite App...
start cmd /k "cd frontend && npm run dev"

echo.
echo Servers are booting up in separate windows!
echo - Backend API Docs: http://localhost:8000/docs
echo - Frontend Application: http://localhost:5173
echo.
pause
