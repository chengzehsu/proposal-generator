#!/bin/bash

# 智能標案產生器 Zeabur 部署腳本
# 執行前請確保已完成以下步驟：
# 1. 安裝 Zeabur CLI: npm install -g @zeabur/cli
# 2. 登入 Zeabur: zeabur auth login
# 3. 設定必要的環境變數

echo "🚀 開始部署智能標案產生器到 Zeabur..."

# 檢查必要工具
if ! command -v zeabur &> /dev/null; then
    echo "❌ Zeabur CLI 未安裝，請先執行: npm install -g @zeabur/cli"
    exit 1
fi

# 檢查登入狀態
if ! zeabur profile &> /dev/null; then
    echo "❌ 未登入 Zeabur，請先執行: zeabur auth login"
    exit 1
fi

# 確認環境變數
echo "📋 檢查必要的環境變數..."
required_vars=("JWT_SECRET" "GEMINI_API_KEY" "DB_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚠️  環境變數 $var 未設定"
        echo "請設定: export $var='your-value'"
        exit 1
    fi
done

# 建構專案
echo "🔨 建構專案..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 建構失敗"
    exit 1
fi

# 建立 Zeabur 專案
echo "📦 建立 Zeabur 專案..."
zeabur project create proposal-generator --region ap-northeast-1

# 取得專案 ID
PROJECT_ID=$(zeabur project list --format json | jq -r '.[] | select(.name == "proposal-generator") | .id')
echo "專案 ID: $PROJECT_ID"

# 建立資料庫服務
echo "🗄️ 建立 PostgreSQL 資料庫..."
zeabur service create \
    --project-id $PROJECT_ID \
    --name proposal-database \
    --template postgresql \
    --region ap-northeast-1

# 取得資料庫連接 URL
DATABASE_URL=$(zeabur variable list --project-id $PROJECT_ID --service-name proposal-database --format json | jq -r '.[] | select(.name == "DATABASE_URL") | .value')

# 建立後端服務
echo "⚙️ 建立後端服務..."
zeabur service create \
    --project-id $PROJECT_ID \
    --name proposal-backend \
    --git-url $(git config --get remote.origin.url) \
    --git-branch main \
    --root-directory backend \
    --build-command "npm run build" \
    --start-command "npm start"

# 設定後端環境變數
echo "🔧 設定後端環境變數..."
zeabur variable set --project-id $PROJECT_ID --service-name proposal-backend \
    NODE_ENV=production \
    PORT=3001 \
    JWT_SECRET="$JWT_SECRET" \
    JWT_EXPIRES_IN=7d \
    JWT_REFRESH_SECRET="$JWT_SECRET-refresh" \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    DATABASE_URL="$DATABASE_URL" \
    UPLOAD_MAX_SIZE=10MB \
    UPLOAD_DIR=./uploads \
    RATE_LIMIT_MAX_REQUESTS=100 \
    RATE_LIMIT_WINDOW_MS=900000 \
    LOG_LEVEL=info \
    BCRYPT_ROUNDS=12

# 建立前端服務
echo "🌐 建立前端服務..."
BACKEND_URL="https://proposal-backend-$PROJECT_ID.zeabur.app"
zeabur service create \
    --project-id $PROJECT_ID \
    --name proposal-frontend \
    --git-url $(git config --get remote.origin.url) \
    --git-branch main \
    --root-directory frontend \
    --build-command "npm run build" \
    --output-directory dist

# 設定前端環境變數
echo "🔧 設定前端環境變數..."
zeabur variable set --project-id $PROJECT_ID --service-name proposal-frontend \
    VITE_API_URL="$BACKEND_URL"

# 部署所有服務
echo "🚀 部署所有服務..."
zeabur deploy --project-id $PROJECT_ID

# 顯示部署結果
echo "✅ 部署完成！"
echo ""
echo "🌐 前端 URL: https://proposal-frontend-$PROJECT_ID.zeabur.app"
echo "⚙️ 後端 URL: $BACKEND_URL"
echo "🗄️ 資料庫: PostgreSQL 14"
echo ""
echo "📋 下一步："
echo "1. 設定自定義域名（可選）"
echo "2. 配置 Gemini API 密鑰"
echo "3. 執行資料庫遷移"
echo "4. 測試系統功能"

exit 0