@echo off
setlocal
cd /d "%~dp0"
if not exist .venv (
    echo Run INSTALL.bat first.
    exit /b 1
)
call .venv\Scripts\activate.bat

echo Building frontend (latest UI)...
pushd frontend
call npm run build
set BUILD_ERR=%errorlevel%
popd
if not "%BUILD_ERR%"=="0" (
    echo.
    echo Frontend build FAILED - see errors above. Backend not started.
    exit /b 1
)

echo.
echo Starting NeuraClaw at http://127.0.0.1:8090
start "" http://127.0.0.1:8090
python -m neuraclaw
endlocal
