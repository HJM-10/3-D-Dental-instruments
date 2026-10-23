#!/bin/bash
set -e

echo "========================================="
echo "Setting up DNF Trading Application..."
echo "========================================="

echo ""
echo "[1/3] Setting up Backend Virtual Environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

echo "[2/3] Installing Backend Dependencies..."
python3 -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo ""
echo "[3/3] Installing Frontend Dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "========================================="
echo "Setup Complete!"
echo "Make sure you have PostgreSQL running and your .env files are configured."
echo "You can now run the application using:"
echo "./start_app.sh"
echo "========================================="
