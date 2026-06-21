# ============================================
# hawthorn-offer-frontend 一键构建+启动
# ============================================
param(
    [switch]$SkipBuild  # -SkipBuild 跳过构建直接启动
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  hawthorn-offer-frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not $SkipBuild) {
    Write-Host "[1/3] 安装依赖..." -ForegroundColor Yellow
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "依赖安装失败!" -ForegroundColor Red
        exit 1
    }
    Write-Host "      依赖安装完成" -ForegroundColor Green

    Write-Host "[2/3] 构建中..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "构建失败!" -ForegroundColor Red
        exit 1
    }
    Write-Host "      构建完成" -ForegroundColor Green

    Write-Host "[3/3] 启动 Electron..." -ForegroundColor Yellow
} else {
    Write-Host "[1/1] 启动 Electron (跳过构建)..." -ForegroundColor Yellow
}

Write-Host ""
npm run electron:dev
