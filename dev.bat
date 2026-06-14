@echo off
setlocal
cd /d "%~dp0"
if not exist .venv (
    echo Run INSTALL.bat first.
    exit /b 1
)

echo Starting NeuraClaw DEV (backend :8090 + Vite :5173, live reload)...

REM Backend in its own window (editable install; serves the API).
start "NeuraClaw Backend" /D "%~dp0" cmd /k ".venv\Scripts\python.exe -m neuraclaw"

REM Frontend dev server in its own window (HMR; proxies /api to the backend).
start "NeuraClaw Frontend (Vite)" /D "%~dp0frontend" cmd /k "npm run dev"

REM Live build tracker — watcher (127.0.0.1:8091) + its own Vite site (:5174).
REM Localhost only. Skipped if deps aren't installed yet.
if exist "%~dp0tracker\node_modules" (
    start "NeuraClaw Tracker" /D "%~dp0tracker" cmd /k "npm run start"
) else (
    echo   Tracker skipped - run: cd tracker ^&^& npm install
)

REM Give them a moment to boot, then open the dev URL.
timeout /t 5 /nobreak >nul
start "" http://localhost:5173

echo.
echo   Backend : http://127.0.0.1:8090
echo   Frontend: http://localhost:5173   ^<-- open this one
echo   Tracker : http://localhost:5174   ^<-- live build progress
echo.
echo Three windows opened. Close them to stop the servers.
endlocal
