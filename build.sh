#!/bin/bash
# ============================================
# hawthorn-offer-frontend 编译脚本
# 环境要求：Node.js 18+、npm
# ============================================

set -e

echo "=========================================="
echo "  开始编译 hawthorn-offer-frontend"
echo "=========================================="

# 1. 安装依赖
echo ""
echo "[1/3] 安装 npm 依赖..."
npm install --silent

# 2. Vite 构建
echo "[2/3] Vite 构建中..."
npm run build

# 3. 创建 output 目录并复制产物
echo "[3/3] 复制构建产物到 output/ 目录..."
mkdir -p output
cp -r dist/renderer/* output/

echo ""
echo "=========================================="
echo "  前端编译完成！"
echo "  产物路径: output/"
echo "=========================================="