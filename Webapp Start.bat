@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo             NeuraClaw Webapp Launcher              
echo ===================================================

REM Verify virtual environment
if exist .venv goto :venv_exists
echo [ERROR] Virtual environment .venv not found.
echo Please run INSTALL.bat first to set up the environment.
pause
exit /b 1

:venv_exists
REM Check if frontend build exists
if exist "frontend\dist\index.html" goto :start_app

echo [INFO] Frontend build not found. Building it now...
pushd frontend
call npm run build
if %errorlevel% neq 0 goto :build_failed
popd
goto :start_app

:build_failed
echo [ERROR] Frontend build FAILED. See errors above.
popd
pause
exit /b 1

:start_app
echo [INFO] Frontend build detected. Starting...

REM Open Webapp URL in the default browser
echo [INFO] Opening browser at http://127.0.0.1:8090...
start "" http://127.0.0.1:8090

REM Activate environment and start the backend server
call .venv\Scripts\activate.bat
python -m neuraclaw

pause
endlocal
