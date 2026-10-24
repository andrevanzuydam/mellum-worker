@echo off
setlocal

call :ensure uv.exe astral-sh.uv
if errorlevel 1 exit /b 1

call :ensure llama-server.exe llama.cpp
if errorlevel 1 exit /b 1

echo.
echo All checks completed successfully.
echo If anything was installed, open a new terminal before using it.
exit /b 0

:ensure
where /q "%~1"
if not errorlevel 1 (
    echo [OK] %~1 is already available.
    exit /b 0
)

echo [MISSING] %~1 was not found on PATH.

where /q winget.exe
if errorlevel 1 (
    echo [ERROR] WinGet is required to install %~1.
    echo Install App Installer from the Microsoft Store, then rerun.
    exit /b 1
)

echo Installing %~2...
winget install --id "%~2" --exact --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo [ERROR] Installation of %~2 failed.
    echo Review the WinGet message above.
    exit /b 1
)

echo [OK] Installation of %~2 completed.
exit /b 0