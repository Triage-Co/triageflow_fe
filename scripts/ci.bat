@echo off
REM Local CI/CD script for Windows
REM Usage: .\scripts\ci.bat

setlocal enabledelayedexpansion

echo.
echo Starting Local CI/CD Pipeline...
echo.

REM Step 1: Install dependencies
echo Installing dependencies...
call npm ci
if errorlevel 1 (
    echo Failed to install dependencies
    exit /b 1
)
echo Dependencies installed
echo.

REM Step 2: Lint
echo Running ESLint...
call npm run lint
if errorlevel 1 (
    echo ESLint failed
    exit /b 1
)
echo ESLint passed
echo.

REM Step 3: Type check
echo Running TypeScript check...
call npx tsc --noEmit
if errorlevel 1 (
    echo TypeScript check failed
    exit /b 1
)
echo TypeScript check passed
echo.

REM Step 4: Build
echo Building project...
call npm run build
if errorlevel 1 (
    echo Build failed
    exit /b 1
)
echo Build successful
echo.

echo All checks passed! Ready to push!
