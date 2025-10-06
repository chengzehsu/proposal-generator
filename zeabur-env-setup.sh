#!/bin/bash

# ========================================
# Zeabur 環境變數自動設定腳本
# ========================================
#
# 使用方法：
# 1. 確保已登入 Zeabur: zeabur auth login
# 2. 執行此腳本: bash zeabur-env-setup.sh
# ========================================

set -e

echo "🚀 開始設定 Zeabur 生產環境變數..."
echo ""

# 檢查是否已登入 Zeabur
if ! zeabur whoami &> /dev/null; then
    echo "❌ 尚未登入 Zeabur，請先執行: zeabur auth login"
    exit 1
fi

echo "✅ 已登入 Zeabur"
echo ""

# 生成強隨機密鑰
echo "🔐 生成 JWT 密鑰..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

echo "✅ JWT 密鑰已生成"
echo ""

# 設定環境變數
echo "📝 設定 Zeabur 環境變數..."
echo ""

# JWT 密鑰
echo "設定 JWT_SECRET..."
zeabur env set JWT_SECRET="$JWT_SECRET"

echo "設定 JWT_REFRESH_SECRET..."
zeabur env set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"

# 環境設定
echo "設定 NODE_ENV=production..."
zeabur env set NODE_ENV=production

# JWT 過期時間
echo "設定 JWT_EXPIRES_IN=7d..."
zeabur env set JWT_EXPIRES_IN=7d

# 提示用戶設定其他變數
echo ""
echo "⚠️  請手動設定以下環境變數："
echo ""
echo "1. Gemini API Key (必須):"
echo "   zeabur env set GEMINI_API_KEY=<your-gemini-api-key>"
echo ""
echo "2. 前端 URL (必須，在前端部署後設定):"
echo "   zeabur env set FRONTEND_URL=https://your-frontend-app.zeabur.app"
echo ""
echo "3. 資料庫 URL (如果不使用 Zeabur PostgreSQL):"
echo "   zeabur env set DATABASE_URL=<your-database-url>"
echo ""

# 顯示已設定的環境變數
echo "✅ 基本環境變數設定完成！"
echo ""
echo "📋 當前環境變數列表："
zeabur env list

echo ""
echo "🎉 設定完成！請記得設定上述提到的其他必要變數。"
