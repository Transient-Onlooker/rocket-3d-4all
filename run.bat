@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
)

echo Starting Vite dev server...
call npm.cmd run dev

if errorlevel 1 (
  echo Dev server exited with an error.
  pause
  exit /b 1
)
