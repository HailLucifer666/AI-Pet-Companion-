@echo off
REM ── pull.bat ─ Run this FIRST when you sit down at a machine (laptop or desktop).
REM Syncs the latest from GitHub and shows what the other machine shipped.
cd /d "%~dp0"
echo === Pulling latest from GitHub (rebase) ===
git pull --rebase
if errorlevel 1 (
  echo.
  echo !! pull/rebase hit a conflict or divergence. Resolve it before working.
  echo    Do NOT force-push — that can erase the other machine's work.
  exit /b 1
)
echo.
echo === Recent progress (last 12 commits) ===
git --no-pager log --oneline -12
echo.
echo === ROADMAP status (top) ===
powershell -NoProfile -Command "Get-Content ROADMAP.md -TotalCount 12"
echo.
echo Up to date. Read ROADMAP.md for the full status tree, then start building.
