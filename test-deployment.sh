#!/bin/bash

echo "🚀 Zeabur 部署配置測試腳本"
echo "=================================="

# 檢查必要文件
echo "📁 檢查配置文件..."
if [ -f ".github/workflows/deploy.yml" ]; then
    echo "✅ GitHub Actions workflow 存在"
else
    echo "❌ GitHub Actions workflow 不存在"
    exit 1
fi

if [ -f "zeabur.json" ]; then
    echo "✅ zeabur.json 配置存在"
else
    echo "❌ zeabur.json 配置不存在"
    exit 1
fi

# 檢查 package.json 腳本
echo "📦 檢查建構腳本..."
if grep -q "build:shared" package.json; then
    echo "✅ build:shared 腳本存在"
else
    echo "❌ build:shared 腳本不存在"
fi

if grep -q "build:backend" package.json; then
    echo "✅ build:backend 腳本存在"
else
    echo "❌ build:backend 腳本不存在"
fi

if grep -q "build:frontend" package.json; then
    echo "✅ build:frontend 腳本存在"
else
    echo "❌ build:frontend 腳本不存在"
fi

# 檢查 zeabur.json 配置
echo "🔧 檢查 Zeabur 配置..."
if grep -q "proposal-generator.zeabur.app" zeabur.json; then
    echo "✅ 正確的域名配置"
else
    echo "❌ 域名配置錯誤"
fi

# 測試本地建構
echo "🔨 測試本地建構..."
echo "建構 shared 套件..."
if npm run build:shared >/dev/null 2>&1; then
    echo "✅ shared 建構成功"
else
    echo "❌ shared 建構失敗"
fi

echo "建構 backend..."
if npm run build:backend >/dev/null 2>&1; then
    echo "✅ backend 建構成功"
else
    echo "❌ backend 建構失敗"
fi

echo "建構 frontend..."
if npm run build:frontend >/dev/null 2>&1; then
    echo "✅ frontend 建構成功"
else
    echo "❌ frontend 建構失敗"
fi

echo ""
echo "📋 需要設置的 GitHub Secrets:"
echo "   ZEABUR_TOKEN=sk-43y654qlt5ldvrcjj63cpxc4doc27"
echo "   ZEABUR_PROJECT_ID=[從 Zeabur dashboard 獲取]"
echo "   ZEABUR_SERVICE_ID=[從 Zeabur dashboard 獲取]"
echo "   DATABASE_URL=[你的生產資料庫 URL]"
echo "   JWT_SECRET=[你的 JWT 密鑰]"

echo ""
echo "🎯 下一步:"
echo "1. 在 Zeabur dashboard 獲取 PROJECT_ID 和 SERVICE_ID"
echo "2. 在 GitHub repository 設置上述 secrets"
echo "3. 推送代碼到 main 分支測試部署"
echo "4. 檢查 https://proposal-generator.zeabur.app"

echo ""
echo "✅ 配置檢查完成！"