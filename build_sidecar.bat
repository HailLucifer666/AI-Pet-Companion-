@echo off
setlocal
cd /d "%~dp0"

if not exist .venv (
    echo Run INSTALL.bat first.
    exit /b 1
)
call .venv\Scripts\activate.bat

echo Building Python sidecar with PyInstaller...

:: Create binaries dir if it doesn't exist
if not exist "frontend\src-tauri\binaries" mkdir "frontend\src-tauri\binaries"

:: PyInstaller command to build the backend as a single executable
pyinstaller --noconfirm ^
    --onefile ^
    --name "neuraclaw-sidecar-x86_64-pc-windows-msvc" ^
    --distpath "frontend\src-tauri\binaries" ^
    --hidden-import "fastapi" ^
    --hidden-import "uvicorn" ^
    --hidden-import "aiosqlite" ^
    --hidden-import "sqlite_vec" ^
    --collect-all "fastembed" ^
    --collect-all "neuraclaw" ^
    backend\src\neuraclaw\__main__.py

if %ERRORLEVEL% NEQ 0 (
    echo PyInstaller failed.
    exit /b %ERRORLEVEL%
)

echo.
echo Sidecar built successfully.
pause
endlocal
