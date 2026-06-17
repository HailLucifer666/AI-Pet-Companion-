@echo off
setlocal
cd /d "%~dp0"

echo ===========================================
echo Building AI Pet Companion - Tauri Installer
echo ===========================================
echo.

:: Ensure the Python sidecar is built
if not exist "frontend\src-tauri\binaries\neuraclaw-sidecar-x86_64-pc-windows-msvc.exe" (
    echo Sidecar not found. Building sidecar first...
    call build_sidecar.bat
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to build sidecar. Aborting.
        exit /b %ERRORLEVEL%
    )
) else (
    echo Sidecar already exists. Proceeding with Tauri build...
)

echo.
echo Installing frontend dependencies if needed...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install npm dependencies. Aborting.
    exit /b %ERRORLEVEL%
)

echo.
echo Running Tauri build...
call npx tauri build
if %ERRORLEVEL% NEQ 0 (
    echo Tauri build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo ===========================================
echo Build completed successfully!
echo Look in frontend\src-tauri\target\release\bundle\msi\ for the installer.
echo ===========================================
pause
endlocal
