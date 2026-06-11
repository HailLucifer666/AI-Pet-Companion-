@echo off
setlocal
cd /d "%~dp0"
if not exist .venv (
    echo Run INSTALL.bat first.
    exit /b 1
)
call .venv\Scripts\activate.bat
echo Starting NeuraClaw V3 at http://127.0.0.1:8090
start "" http://127.0.0.1:8090
python -m neuraclaw
endlocal
