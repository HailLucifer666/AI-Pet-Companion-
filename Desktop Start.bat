@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo             NeuraClaw Desktop Launcher             
echo ===================================================

if exist .venv goto :venv_exists
echo [ERROR] Virtual environment .venv not found.
echo Please run INSTALL.bat first to set up the environment.
pause
exit /b 1

:venv_exists
echo [INFO] Starting NeuraClaw Backend in a new window...
start "NeuraClaw Backend" /D "%~dp0" cmd /k ".venv\Scripts\python.exe -m neuraclaw"

echo [INFO] Starting Tauri Desktop App...
cd frontend
call npx tauri dev

pause
endlocal
