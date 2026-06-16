@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo             NeuraClaw Webapp Launcher              
echo ===================================================

REM Verify virtual environment
if not exist .venv (
    echo [ERROR] Virtual environment (.venv) not found!
    echo Please run INSTALL.bat first to set up the environment.
    pause
    exit /b 1
)

REM Verify frontend build exists, build if missing
if not exist "frontend\dist\index.html" (
    echo [INFO] Frontend build not found. Building it now...
    pushd frontend
    call npm run build
    set BUILD_ERR=%errorlevel%
    popd
    if not "%BUILD_ERR%"=="0" (
        echo [ERROR] Frontend build FAILED. See errors above.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Frontend build detected. Starting instantly...
)

REM Open Webapp URL in the default browser
echo [INFO] Opening browser at http://127.0.0.1:8090...
start "" http://127.0.0.1:8090

REM Activate environment and start the backend server
call .venv\Scripts\activate.bat
python -m neuraclaw

pause
endlocal
