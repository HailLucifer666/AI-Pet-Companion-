@echo off
setlocal
cd /d "%~dp0"
echo === NeuraClaw V3 install ===

where python >nul 2>nul
if errorlevel 1 (
    echo Python not found. Install Python 3.11+ from https://python.org and re-run.
    exit /b 1
)

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv || exit /b 1
)

call .venv\Scripts\activate.bat
echo Installing backend dependencies...
python -m pip install --upgrade pip >nul
pip install -e .[dev] || exit /b 1

if not exist config.yaml copy config.example.yaml config.yaml >nul
if not exist .env copy .env.example .env >nul

echo Verifying sqlite-vec extension and schema...
python -m pytest backend/tests/test_db.py -q || (
    echo sqlite-vec smoke test FAILED. See output above.
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo NOTE: Node.js not found - frontend build skipped. Install Node 20+ to build the UI.
) else (
    if exist frontend\package.json (
        echo Installing frontend dependencies...
        pushd frontend
        call npm install || (popd & exit /b 1)
        call npm run build || (popd & exit /b 1)
        popd
    )
)

echo.
echo Install complete. Edit .env with your API keys, then run START.bat
endlocal
