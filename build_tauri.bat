@echo off
setlocal
cd /d "%~dp0"

:: Enforce redirected cache directories to keep build assets off C: drive
set "CARGO_HOME=F:\C Drive Packages Dump\cargo"
set "RUSTUP_HOME=F:\C Drive Packages Dump\rustup"
set "NPM_CONFIG_CACHE=F:\C Drive Packages Dump\npm-cache"
set "TMP=F:\C Drive Packages Dump\Temp"
set "TEMP=F:\C Drive Packages Dump\Temp"
set "PATH=F:\C Drive Packages Dump\cargo\bin;%PATH%"

:: Set up MSVC build environment if not automatically detected by vswhere
set "VSWHERE_PATH=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "HAS_MSVC=0"

if exist "%VSWHERE_PATH%" (
    for /f "usebackq tokens=*" %%i in (`"%VSWHERE_PATH%" -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
        set "HAS_MSVC=1"
    )
)

if "%HAS_MSVC%"=="0" (
    echo [Tauri Build] MSVC compiler not registered in vswhere.
    echo [Tauri Build] Checking for manual installation at F:\VS C++...
    if exist "F:\VS C++\VC\Auxiliary\Build\vcvars64.bat" (
        echo [Tauri Build] Found F:\VS C++ environment configuration. Sourcing compiler environment...
        call "F:\VS C++\VC\Auxiliary\Build\vcvars64.bat"
    ) else (
        echo [Tauri Build] WARNING: Could not find MSVC compiler via vswhere or at F:\VS C++. Compilation may fail.
    )
) else (
    echo [Tauri Build] MSVC compiler found via vswhere.
)
echo.

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
