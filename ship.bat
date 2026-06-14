@echo off
REM ── ship.bat ─ Commit ALL changes and push to GitHub before swapping machines.
REM Usage:  ship.bat "feat(world): what changed"
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: ship.bat "type(scope): commit message"
  echo   e.g. ship.bat "feat(world): the Quickening hatch cinematic"
  exit /b 1
)
git add -A
git commit -m "%~1"
echo.
echo === Rebasing onto GitHub latest, then pushing ===
git pull --rebase
if errorlevel 1 (
  echo.
  echo !! divergence on pull. Resolve it before pushing. Do NOT force.
  exit /b 1
)
git push
if errorlevel 1 (
  echo !! push failed — check your connection / credentials.
  exit /b 1
)
echo.
echo Pushed to GitHub master. Safe to switch machines.
