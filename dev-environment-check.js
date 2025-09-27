#!/usr/bin/env node

/**
 * 智能標案產生器 - 開發環境完整性檢查
 * 系統整合專員 - 開發環境驗證
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class DevEnvironmentChecker {
  constructor() {
    this.checkResults = [];
    this.services = {
      backend: { port: 3001, url: 'http://localhost:3001', process: null },
      frontend: { port: 5173, url: 'http://localhost:5173', process: null }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warn': '⚠️',
      'check': '🔍'
    };
    console.log(`[${timestamp}] ${emoji[type] || 'ℹ️'} ${message}`);
  }

  async execCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000, ...options }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${command}\n${error.message}\n${stderr}`));
        } else {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        }
      });
    });
  }

  async checkNodeVersion() {
    this.log('檢查 Node.js 版本...', 'check');
    
    try {
      const { stdout } = await this.execCommand('node --version');
      const version = stdout.replace('v', '');
      const majorVersion = parseInt(version.split('.')[0]);
      
      if (majorVersion >= 18) {
        this.log(`✅ Node.js 版本: ${stdout} (符合要求)`, 'success');
        return true;
      } else {
        this.log(`❌ Node.js 版本過舊: ${stdout} (需要 >= 18)`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Node.js 檢查失敗: ${error.message}`, 'error');
      return false;
    }
  }

  async checkNpmDependencies() {
    this.log('檢查 npm 依賴...', 'check');
    
    const packageDirs = ['', 'backend', 'frontend', 'shared'];
    let allDepsOk = true;

    for (const dir of packageDirs) {
      const fullPath = dir ? path.join(process.cwd(), dir) : process.cwd();
      const packageJsonPath = path.join(fullPath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        this.log(`⚠️  跳過 ${dir || 'root'} - 沒有 package.json`, 'warn');
        continue;
      }

      try {
        this.log(`檢查 ${dir || 'root'} 依賴...`);
        await this.execCommand('npm ls --depth=0', { cwd: fullPath });
        this.log(`✅ ${dir || 'root'} 依賴檢查通過`, 'success');
      } catch (error) {
        this.log(`❌ ${dir || 'root'} 依賴問題: ${error.message}`, 'error');
        allDepsOk = false;
        
        // 嘗試安裝依賴
        try {
          this.log(`嘗試安裝 ${dir || 'root'} 依賴...`);
          await this.execCommand('npm install', { cwd: fullPath });
          this.log(`✅ ${dir || 'root'} 依賴安裝成功`, 'success');
        } catch (installError) {
          this.log(`❌ ${dir || 'root'} 依賴安裝失敗: ${installError.message}`, 'error');
        }
      }
    }

    return allDepsOk;
  }

  async checkDatabaseConnection() {
    this.log('檢查資料庫連接...', 'check');
    
    try {
      // 檢查 .env 文件
      const envPath = path.join(process.cwd(), 'backend', '.env');
      if (!fs.existsSync(envPath)) {
        this.log('❌ 後端 .env 文件不存在', 'error');
        
        // 創建示例 .env 文件
        const envExample = path.join(process.cwd(), 'backend', '.env.example');
        if (fs.existsSync(envExample)) {
          fs.copyFileSync(envExample, envPath);
          this.log('✅ 已創建 .env 文件（基於 .env.example）', 'success');
        }
      }

      // 嘗試 Prisma 生成
      await this.execCommand('npx prisma generate', { 
        cwd: path.join(process.cwd(), 'backend') 
      });
      this.log('✅ Prisma 客戶端生成成功', 'success');
      
      return true;
    } catch (error) {
      this.log(`⚠️  資料庫檢查警告: ${error.message}`, 'warn');
      return false;
    }
  }

  async startService(serviceName) {
    const service = this.services[serviceName];
    this.log(`啟動 ${serviceName} 服務...`);

    return new Promise((resolve, reject) => {
      const command = serviceName === 'backend' ? 'npm run dev:backend' : 'npm run dev:frontend';
      
      const process = spawn('npm', ['run', `dev:${serviceName}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      let outputBuffer = '';
      let startupDetected = false;

      process.stdout.on('data', (data) => {
        outputBuffer += data.toString();
        
        // 檢查啟動成功的標誌
        const successPatterns = {
          backend: ['Server running', 'listening', 'started'],
          frontend: ['Local:', 'ready', 'running']
        };

        if (successPatterns[serviceName].some(pattern => 
          outputBuffer.toLowerCase().includes(pattern.toLowerCase()))) {
          if (!startupDetected) {
            startupDetected = true;
            service.process = process;
            this.log(`✅ ${serviceName} 服務啟動成功`, 'success');
            resolve(true);
          }
        }
      });

      process.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.includes('Error') || errorOutput.includes('error')) {
          this.log(`❌ ${serviceName} 啟動錯誤: ${errorOutput}`, 'error');
          if (!startupDetected) {
            reject(new Error(errorOutput));
          }
        }
      });

      process.on('exit', (code) => {
        if (code !== 0 && !startupDetected) {
          reject(new Error(`${serviceName} 進程退出，代碼: ${code}`));
        }
      });

      // 設置超時
      setTimeout(() => {
        if (!startupDetected) {
          process.kill();
          reject(new Error(`${serviceName} 啟動超時`));
        }
      }, 30000);
    });
  }

  async checkServiceHealth(serviceName) {
    const service = this.services[serviceName];
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        if (response.status === 200) {
          this.log(`✅ ${serviceName} 服務健康檢查通過`, 'success');
          return true;
        }
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          this.log(`⏳ ${serviceName} 健康檢查重試 ${retries}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    this.log(`❌ ${serviceName} 健康檢查失敗`, 'error');
    return false;
  }

  async checkBuildProcess() {
    this.log('檢查建置流程...', 'check');
    
    try {
      // 檢查 shared 建置
      this.log('建置 shared 模組...');
      await this.execCommand('npm run build:shared');
      this.log('✅ shared 模組建置成功', 'success');

      // 檢查 TypeScript 編譯
      this.log('檢查 TypeScript 編譯...');
      await this.execCommand('npm run type-check:backend');
      await this.execCommand('npm run type-check:frontend');
      this.log('✅ TypeScript 編譯檢查通過', 'success');

      return true;
    } catch (error) {
      this.log(`❌ 建置流程檢查失敗: ${error.message}`, 'error');
      return false;
    }
  }

  async checkLintingAndFormatting() {
    this.log('檢查程式碼品質...', 'check');
    
    try {
      // 檢查 ESLint
      await this.execCommand('npm run lint:backend');
      await this.execCommand('npm run lint:frontend');
      this.log('✅ ESLint 檢查通過', 'success');

      return true;
    } catch (error) {
      this.log(`⚠️  程式碼品質檢查警告: ${error.message}`, 'warn');
      
      // 嘗試自動修復
      try {
        await this.execCommand('npm run lint:backend -- --fix');
        await this.execCommand('npm run lint:frontend -- --fix');
        this.log('✅ 已自動修復部分問題', 'success');
        return true;
      } catch (fixError) {
        this.log(`❌ 自動修復失敗: ${fixError.message}`, 'error');
        return false;
      }
    }
  }

  stopServices() {
    this.log('停止開發服務...');
    
    Object.entries(this.services).forEach(([name, service]) => {
      if (service.process && !service.process.killed) {
        service.process.kill();
        this.log(`🛑 ${name} 服務已停止`);
      }
    });
  }

  async generateEnvironmentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        workingDirectory: process.cwd()
      },
      checks: this.checkResults,
      recommendations: []
    };

    // 生成建議
    const failedChecks = this.checkResults.filter(check => !check.passed);
    if (failedChecks.length > 0) {
      report.recommendations.push({
        priority: 'high',
        message: '請修復失敗的環境檢查項目',
        details: failedChecks.map(check => check.name)
      });
    }

    const reportPath = path.join(process.cwd(), 'dev-environment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`📋 環境檢查報告已生成: ${reportPath}`);
    return report;
  }

  async runFullCheck() {
    this.log('🚀 開始開發環境完整性檢查...');
    
    const checks = [
      { name: 'Node.js 版本', fn: () => this.checkNodeVersion() },
      { name: 'npm 依賴', fn: () => this.checkNpmDependencies() },
      { name: '資料庫連接', fn: () => this.checkDatabaseConnection() },
      { name: '建置流程', fn: () => this.checkBuildProcess() },
      { name: '程式碼品質', fn: () => this.checkLintingAndFormatting() }
    ];

    // 執行基礎檢查
    for (const check of checks) {
      try {
        const passed = await check.fn();
        this.checkResults.push({ name: check.name, passed, timestamp: new Date().toISOString() });
      } catch (error) {
        this.log(`❌ ${check.name} 檢查失敗: ${error.message}`, 'error');
        this.checkResults.push({ 
          name: check.name, 
          passed: false, 
          error: error.message,
          timestamp: new Date().toISOString() 
        });
      }
    }

    // 嘗試啟動服務
    try {
      this.log('🚀 嘗試啟動開發服務...');
      
      // 並行啟動服務
      const servicePromises = Object.keys(this.services).map(async (serviceName) => {
        try {
          await this.startService(serviceName);
          await this.checkServiceHealth(serviceName);
          return { service: serviceName, success: true };
        } catch (error) {
          this.log(`❌ ${serviceName} 服務啟動失敗: ${error.message}`, 'error');
          return { service: serviceName, success: false, error: error.message };
        }
      });

      const serviceResults = await Promise.allSettled(servicePromises);
      
      // 等待服務穩定
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 檢查服務狀態
      for (const result of serviceResults) {
        if (result.status === 'fulfilled') {
          this.checkResults.push({
            name: `${result.value.service} 服務`,
            passed: result.value.success,
            error: result.value.error,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      this.log(`❌ 服務啟動檢查失敗: ${error.message}`, 'error');
    } finally {
      // 停止服務
      setTimeout(() => this.stopServices(), 2000);
    }

    // 生成報告
    const report = await this.generateEnvironmentReport();
    
    const passedChecks = this.checkResults.filter(check => check.passed).length;
    const totalChecks = this.checkResults.length;
    
    this.log(`\n📊 開發環境檢查完成:`);
    this.log(`✅ 通過: ${passedChecks}/${totalChecks}`);
    this.log(`❌ 失敗: ${totalChecks - passedChecks}/${totalChecks}`);
    
    if (passedChecks === totalChecks) {
      this.log('🎉 開發環境配置完美！', 'success');
      return 0;
    } else if (passedChecks >= totalChecks * 0.8) {
      this.log('⚡ 開發環境基本正常，少數問題需要修復', 'warn');
      return 0;
    } else {
      this.log('🚨 開發環境存在嚴重問題，需要修復後再繼續', 'error');
      return 1;
    }
  }
}

// 執行檢查
if (require.main === module) {
  const checker = new DevEnvironmentChecker();
  
  // 優雅退出處理
  process.on('SIGINT', () => {
    console.log('\n收到中斷信號，正在清理...');
    checker.stopServices();
    process.exit(0);
  });

  checker.runFullCheck()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('開發環境檢查執行失敗:', error);
      checker.stopServices();
      process.exit(1);
    });
}

module.exports = DevEnvironmentChecker;