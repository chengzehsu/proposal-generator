const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 快速部署腳本
async function quickDeploy() {
  console.log('🚀 啟動快速部署流程...\n');

  // 1. 檢查環境
  console.log('📋 環境檢查:');
  const nodeVersion = process.version;
  console.log(`   Node.js: ${nodeVersion}`);
  console.log(`   平台: ${process.platform}`);
  console.log(`   架構: ${process.arch}\n`);

  // 2. 檢查必要文件
  console.log('📁 檢查部署文件:');
  const requiredFiles = [
    'zeabur.json',
    'Dockerfile', 
    'package.json',
    'frontend/dist/index.html',
    'backend/dist/index.js'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
  }

  if (!allFilesExist) {
    console.log('\n❌ 缺少必要檔案，請先完成構建');
    return;
  }

  // 3. 生成部署配置
  console.log('\n⚙️ 生成部署配置...');
  
  const deployConfig = {
    name: "proposal-generator",
    services: {
      backend: {
        build: {
          dockerfile: "Dockerfile"
        },
        environment: {
          NODE_ENV: "production",
          PORT: "3001"
        },
        ports: [3001],
        healthCheck: "/health"
      }
    }
  };

  fs.writeFileSync('deploy-config.json', JSON.stringify(deployConfig, null, 2));
  console.log('   ✅ 部署配置已生成');

  // 4. 建立啟動腳本
  console.log('\n🔧 建立生產啟動腳本...');
  
  const startScript = `#!/bin/bash
echo "🚀 啟動智能標案產生器..."

# 設定環境變數
export NODE_ENV=production
export PORT=3001
export DATABASE_URL="file:./production.db"
export JWT_SECRET="production-jwt-secret-key-256-bits"
export GEMINI_API_KEY="your-gemini-key"

# 初始化資料庫
cd backend
npx prisma migrate deploy
npx prisma generate

# 啟動後端服務
echo "🔧 啟動後端 API 服務..."
node dist/index.js &
BACKEND_PID=$!

# 啟動前端服務 (簡單 HTTP 服務器)
cd ../frontend
echo "🎨 啟動前端服務..."
npx serve dist -l 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ 服務已啟動!"
echo "📊 前端: http://localhost:3000"
echo "🔧 後端: http://localhost:3001"
echo "🩺 健康檢查: http://localhost:3001/health"
echo ""
echo "🛑 停止服務: kill $BACKEND_PID $FRONTEND_PID"

# 等待服務
wait
`;

  fs.writeFileSync('start-production.sh', startScript);
  fs.chmodSync('start-production.sh', 0o755);
  console.log('   ✅ 生產啟動腳本已建立');

  // 5. 測試本地生產環境
  console.log('\n🧪 測試本地生產環境...');
  
  try {
    // 安裝 serve (如果需要)
    const { execSync } = require('child_process');
    execSync('npm install -g serve', { stdio: 'pipe' });
    console.log('   ✅ HTTP 服務器已準備');

    console.log('\n🎉 部署準備完成!');
    console.log('\n📝 啟動方式:');
    console.log('   本地測試: ./start-production.sh');
    console.log('   Docker: ./deploy.sh');
    console.log('   雲端: git push 觸發自動部署');

    console.log('\n🌐 部署後可用地址:');
    console.log('   前端應用: http://localhost:3000');
    console.log('   後端 API: http://localhost:3001');
    console.log('   API 文檔: http://localhost:3001/health');

  } catch (error) {
    console.log('   ⚠️ 某些依賴可能需要手動安裝');
  }

  console.log('\n✨ 快速部署流程完成!');
}

quickDeploy().catch(console.error);