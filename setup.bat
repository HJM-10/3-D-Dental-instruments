@echo off
echo =========================================
echo Setting up DNF Trading Application...
echo =========================================

echo.
echo [1/3] Setting up Backend Virtual Environment...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
echo [2/3] Installing Backend Dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo.
echo [3/3] Installing Frontend Dependencies...
cd frontend
npm install
cd ..

echo.
echo =========================================
echo Setup Complete!
echo You can now run the application using:
echo start_app.bat
echo =========================================
pause
