#!/bin/bash
# ============================================
# hawthorn-offer-frontend 一键构建+启动 (Linux/macOS)
# ============================================
set -e

echo "========================================"
echo "  hawthorn-offer-frontend"
echo "========================================"

if [ "$1" != "--skip-build" ]; then
    echo "[1/3] 安装依赖..."
    npm install --silent
    echo "      依赖安装完成"

    echo "[2/3] 构建中..."
    npm run build
    echo "      构建完成"

    echo "[3/3] 启动 Electron..."
else
    echo "[1/1] 启动 Electron (跳过构建)..."
fi

echo ""
npm run electron:dev
