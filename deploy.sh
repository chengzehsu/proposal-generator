#!/bin/bash

# 智能標案產生器部署腳本
set -e

echo "🚀 開始部署智能標案產生器..."

# 檢查必要工具
command -v docker >/dev/null 2>&1 || { echo "❌ Docker 未安裝"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose 未安裝"; exit 1; }

# 檢查環境變數檔案
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production 檔案不存在，使用範例檔案..."
    cp .env.production.example .env.production
    echo "📝 請編輯 .env.production 設定實際的環境變數"
fi

# 停止現有容器
echo "🛑 停止現有容器..."
docker-compose down --remove-orphans

# 清理舊的構建
echo "🧹 清理舊的構建..."
docker system prune -f

# 構建所有服務
echo "🔨 構建共享模組..."
npm run build:shared

echo "🔨 構建前端..."
npm run build:frontend

echo "🔨 構建後端..."
cd backend && npm run build && cd ..

# 構建 Docker 映像
echo "🐳 構建 Docker 映像..."
docker-compose build --no-cache

# 啟動服務
echo "🚀 啟動服務..."
docker-compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 健康檢查
echo "🩺 執行健康檢查..."
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ 後端服務健康檢查通過"
else
    echo "❌ 後端服務健康檢查失敗"
    docker-compose logs backend
    exit 1
fi

if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ 前端服務健康檢查通過"
else
    echo "❌ 前端服務健康檢查失敗"
    docker-compose logs frontend
    exit 1
fi

# 執行資料庫遷移
echo "🗃️ 執行資料庫遷移..."
docker-compose exec backend npx prisma migrate deploy

echo "🎉 部署完成！"
echo ""
echo "📊 服務狀態:"
echo "- 前端: http://localhost:3000"
echo "- 後端 API: http://localhost:3001"
echo "- 健康檢查: http://localhost:3001/health"
echo ""
echo "📝 查看日誌: docker-compose logs -f"
echo "🛑 停止服務: docker-compose down"