#!/bin/bash

# 智能標案產生器本地生產環境啟動腳本

echo "🚀 啟動智能標案產生器生產環境..."

# 設定環境變數
export NODE_ENV=production
export DATABASE_URL="file:./production.db"
export PORT=3001
export JWT_SECRET="your-super-secret-jwt-key-256-bits-long-production-ready"
export JWT_REFRESH_SECRET="your-refresh-secret-key-256-bits-long-production"
export GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY_HERE"

echo "📋 環境設定："
echo "  NODE_ENV: $NODE_ENV"
echo "  PORT: $PORT"
echo "  DATABASE_URL: $DATABASE_URL"

# 檢查建構檔案
if [ ! -d "backend/dist" ]; then
    echo "❌ 後端建構檔案不存在，請先執行: npm run build"
    exit 1
fi

if [ ! -d "frontend/dist" ]; then
    echo "❌ 前端建構檔案不存在，請先執行: npm run build"
    exit 1
fi

# 檢查資料庫
if [ ! -f "backend/production.db" ]; then
    echo "🗄️ 初始化生產資料庫..."
    cd backend
    npx prisma db push
    cd ..
fi

# 啟動後端服務器
echo "⚙️ 啟動後端服務器 (Port: $PORT)..."
cd backend
node dist/server.js &
BACKEND_PID=$!
cd ..

# 等待後端啟動
sleep 3

# 檢查後端健康狀態
echo "🔍 檢查後端服務狀態..."
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "✅ 後端服務正常運行"
else
    echo "❌ 後端服務啟動失敗"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 啟動前端服務器 (使用 serve)
if command -v serve &> /dev/null; then
    echo "🌐 啟動前端服務器 (Port: 5000)..."
    cd frontend
    serve -s dist -l 5000 &
    FRONTEND_PID=$!
    cd ..
    echo "✅ 前端服務器啟動完成"
else
    echo "⚠️ serve 未安裝，請手動提供前端檔案"
    echo "建議安裝: npm install -g serve"
fi

echo ""
echo "🎉 智能標案產生器已啟動！"
echo ""
echo "📍 服務地址："
echo "  🌐 前端: http://localhost:5000"
echo "  ⚙️ 後端: http://localhost:$PORT"
echo "  📊 健康檢查: http://localhost:$PORT/health"
echo "  📚 API 文檔: http://localhost:$PORT/api-docs"
echo ""
echo "🛑 停止服務: Ctrl+C"

# 等待中斷信號
trap 'echo "🛑 正在停止服務..."; kill $BACKEND_PID 2>/dev/null; kill $FRONTEND_PID 2>/dev/null; exit 0' INT

# 保持腳本運行
wait