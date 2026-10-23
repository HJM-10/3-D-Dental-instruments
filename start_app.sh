#!/bin/bash

echo "========================================="
echo "Starting DNF Trading Application..."
echo "========================================="

# Function to handle cleanup on script exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to run the cleanup function
trap cleanup SIGINT SIGTERM

echo "[1/2] Starting Backend API..."
cd backend
source venv/bin/activate
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

echo "[2/2] Starting Frontend Vite App..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Servers are booting up!"
echo "- Backend API Docs: http://localhost:8000/docs"
echo "- Frontend Application: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "========================================="

# Wait indefinitely until interrupted
wait
