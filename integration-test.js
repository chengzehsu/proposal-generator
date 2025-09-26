#!/usr/bin/env node

/**
 * 前後端整合測試腳本
 * 檢查前後端是否能正常連接和通信
 */

const http = require('http');
const { exec } = require('child_process');
const path = require('path');

// 測試配置
const config = {
  backend: {
    port: 3001,
    baseUrl: 'http://localhost:3001',
    startScript: 'npm run dev',
    workDir: path.join(__dirname, 'backend')
  },
  frontend: {
    port: 3000,
    baseUrl: 'http://localhost:3000', 
    startScript: 'npm run dev',
    workDir: path.join(__dirname, 'frontend')
  }
};

// 輔助函數：檢查服務是否啟動
function checkService(url, timeout = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    
    http.get(url, (res) => {
      clearTimeout(timer);
      resolve(res.statusCode === 200);
    }).on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

// 輔助函數：等待服務啟動
async function waitForService(name, url, maxAttempts = 30) {
  console.log(`⏳ 等待 ${name} 服務啟動...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    const isRunning = await checkService(url);
    if (isRunning) {
      console.log(`✅ ${name} 服務已啟動 (${url})`);
      return true;
    }
    
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n❌ ${name} 服務啟動失敗`);
  return false;
}

// 輔助函數：執行 API 測試
async function testAPI() {
  console.log('\n🧪 執行 API 測試...');
  
  try {
    // 測試健康檢查端點
    const healthCheck = await new Promise((resolve, reject) => {
      http.get(`${config.backend.baseUrl}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
    
    console.log('✅ 健康檢查通過:', healthCheck);
    
    // 測試 API 根端點
    const apiRoot = await new Promise((resolve, reject) => {
      http.get(`${config.backend.baseUrl}/api/v1`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
    
    console.log('✅ API 根端點正常:', apiRoot.message);
    console.log('📋 可用端點:', Object.keys(apiRoot.endpoints).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ API 測試失敗:', error.message);
    return false;
  }
}

// 主要測試流程
async function runIntegrationTest() {
  console.log('🚀 開始前後端整合測試\n');
  
  try {
    // 1. 檢查後端服務
    console.log('1. 檢查後端服務狀態...');
    const backendRunning = await checkService(`${config.backend.baseUrl}/health`);
    
    if (!backendRunning) {
      console.log('❌ 後端服務未運行，請先啟動後端:');
      console.log(`   cd ${config.backend.workDir}`);
      console.log(`   ${config.backend.startScript}`);
      process.exit(1);
    }
    
    console.log('✅ 後端服務正常運行');
    
    // 2. 執行 API 測試
    console.log('\n2. 執行 API 連接測試...');
    const apiTestPassed = await testAPI();
    
    if (!apiTestPassed) {
      console.log('❌ API 測試失敗');
      process.exit(1);
    }
    
    // 3. 檢查前端連接（如果前端正在運行）
    console.log('\n3. 檢查前端服務狀態...');
    const frontendRunning = await checkService(config.frontend.baseUrl);
    
    if (frontendRunning) {
      console.log('✅ 前端服務正常運行');
      console.log('🌐 前端地址:', config.frontend.baseUrl);
    } else {
      console.log('⚠️  前端服務未運行 (可選)');
      console.log('   如需啟動前端:');
      console.log(`   cd ${config.frontend.workDir}`);
      console.log(`   ${config.frontend.startScript}`);
    }
    
    // 4. 測試結果總結
    console.log('\n📊 整合測試結果:');
    console.log('─'.repeat(40));
    console.log('✅ 後端 API 服務    - 正常');
    console.log('✅ API 端點連接     - 正常');
    console.log('✅ 健康檢查         - 正常');
    console.log(frontendRunning ? '✅ 前端服務         - 正常' : '⚠️  前端服務         - 未啟動');
    console.log('─'.repeat(40));
    
    if (frontendRunning) {
      console.log('🎉 前後端整合測試完全通過！');
      console.log('🌟 系統已準備好進行完整測試');
    } else {
      console.log('✅ 後端整合測試通過！');
      console.log('💡 建議啟動前端服務進行完整測試');
    }
    
  } catch (error) {
    console.error('❌ 整合測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  runIntegrationTest().catch(error => {
    console.error('💥 整合測試失敗:', error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTest,
  checkService,
  waitForService
};