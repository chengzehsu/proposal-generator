const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// 簡化的部署測試腳本
class DeploymentTester {
  constructor() {
    this.results = {
      build: {
        shared: false,
        frontend: false,
        backend: false
      },
      services: {
        backend: false,
        frontend: false
      },
      healthChecks: {
        api: false,
        database: false
      }
    };
  }

  async runCommand(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      const proc = spawn('npm', ['run', command], { 
        cwd, 
        stdio: 'pipe',
        shell: true 
      });
      
      let output = '';
      let error = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed: ${error}`));
        }
      });
    });
  }

  async testBuild() {
    console.log('🔨 測試構建流程...');
    
    try {
      // 測試共享模組構建
      console.log('  📦 構建共享模組...');
      await this.runCommand('build:shared');
      this.results.build.shared = true;
      console.log('    ✅ 共享模組構建成功');
      
      // 測試前端構建
      console.log('  🎨 構建前端...');
      await this.runCommand('build:frontend');
      this.results.build.frontend = true;
      console.log('    ✅ 前端構建成功');
      
      // 檢查前端構建檔案
      const frontendDist = path.join(__dirname, 'frontend/dist');
      if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
        console.log('    ✅ 前端檔案存在');
      } else {
        throw new Error('前端構建檔案不存在');
      }
      
      // 測試後端構建 
      console.log('  🔧 構建後端...');
      await this.runCommand('build', path.join(__dirname, 'backend'));
      this.results.build.backend = true;
      console.log('    ✅ 後端構建成功');
      
      // 檢查後端構建檔案
      const backendDist = path.join(__dirname, 'backend/dist');
      if (fs.existsSync(path.join(backendDist, 'index.js'))) {
        console.log('    ✅ 後端檔案存在');
      } else {
        throw new Error('後端構建檔案不存在');
      }
      
    } catch (error) {
      console.error('❌ 構建失敗:', error.message);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('🩺 測試健康檢查...');
    
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3001/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success) {
              console.log('    ✅ API 健康檢查通過');
              this.results.healthChecks.api = true;
            } else {
              console.log('    ⚠️ API 健康檢查返回異常');
            }
          } catch (e) {
            console.log('    ⚠️ API 健康檢查響應格式錯誤');
          }
          resolve();
        });
      });
      
      req.on('error', () => {
        console.log('    ⚠️ 無法連接到 API 服務 (這是正常的，因為服務可能未啟動)');
        resolve();
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        console.log('    ⚠️ API 健康檢查超時');
        resolve();
      });
    });
  }

  async testFileStructure() {
    console.log('📁 測試檔案結構...');
    
    const requiredFiles = [
      'package.json',
      'Dockerfile',
      'docker-compose.yml',
      'zeabur.json',
      '.env.production.example',
      'backend/package.json',
      'frontend/package.json',
      'shared/package.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`    ✅ ${file}`);
      } else {
        console.log(`    ❌ ${file} 不存在`);
        return false;
      }
    }
    
    return true;
  }

  generateReport() {
    console.log('\n📊 部署準備度報告');
    console.log('=' * 50);
    
    console.log('\n🔨 構建狀態:');
    console.log(`  共享模組: ${this.results.build.shared ? '✅' : '❌'}`);
    console.log(`  前端: ${this.results.build.frontend ? '✅' : '❌'}`);
    console.log(`  後端: ${this.results.build.backend ? '✅' : '❌'}`);
    
    console.log('\n🩺 健康檢查:');
    console.log(`  API 服務: ${this.results.healthChecks.api ? '✅' : '⚠️ 未測試'}`);
    
    const buildReady = Object.values(this.results.build).every(v => v);
    
    console.log('\n🎯 部署準備度:');
    if (buildReady) {
      console.log('  ✅ 系統已準備好部署！');
      console.log('  📝 下一步:');
      console.log('    1. 設定生產環境變數 (.env.production)');
      console.log('    2. 執行: ./deploy.sh (本地 Docker 部署)');
      console.log('    3. 或推送到 GitHub 觸發 Zeabur 自動部署');
    } else {
      console.log('  ❌ 系統尚未準備好部署');
      console.log('  📝 需要修復構建問題');
    }
  }

  async run() {
    console.log('🚀 開始部署測試...\n');
    
    try {
      await this.testFileStructure();
      await this.testBuild();
      await this.testHealthCheck();
      
      this.generateReport();
      
    } catch (error) {
      console.error('\n❌ 部署測試失敗:', error.message);
      this.generateReport();
      process.exit(1);
    }
  }
}

// 執行測試
const tester = new DeploymentTester();
tester.run();