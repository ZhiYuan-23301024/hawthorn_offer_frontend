@echo off
REM ============================================
REM hawthorn-offer-frontend 一键构建+启动 (Windows CMD)
REM ============================================
if "%1"=="--skip-build" goto run

echo [1/3] 安装依赖...
call npm install --silent
if %ERRORLEVEL% neq 0 (
    echo 依赖安装失败!
    exit /b 1
)
echo       依赖安装完成

echo [2/3] 构建中...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo 构建失败!
    exit /b 1
)
echo       构建完成

echo [3/3] 启动 Electron...
goto run

:run
echo.
call npm run electron:dev
