#!/usr/bin/env node

/**
 * 智能標案產生器 - API 端點功能驗證
 * 系統整合專員 - API 功能檢查
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class APIEndpointsChecker {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.authToken = null;
    this.testResults = [];
    this.apiEndpoints = [
      // 認證相關
      { method: 'POST', path: '/auth/register', category: 'Authentication', requiresAuth: false },
      { method: 'POST', path: '/auth/login', category: 'Authentication', requiresAuth: false },
      { method: 'POST', path: '/auth/refresh', category: 'Authentication', requiresAuth: true },
      { method: 'POST', path: '/auth/logout', category: 'Authentication', requiresAuth: true },
      
      // 公司資料管理
      { method: 'GET', path: '/companies/basic', category: 'Company Management', requiresAuth: true },
      { method: 'PUT', path: '/companies/basic', category: 'Company Management', requiresAuth: true },
      { method: 'GET', path: '/companies/profile', category: 'Company Management', requiresAuth: true },
      { method: 'PUT', path: '/companies/profile', category: 'Company Management', requiresAuth: true },
      
      // 團隊成員管理
      { method: 'GET', path: '/team-members', category: 'Team Management', requiresAuth: true },
      { method: 'POST', path: '/team-members', category: 'Team Management', requiresAuth: true },
      { method: 'GET', path: '/team-members/:id', category: 'Team Management', requiresAuth: true },
      { method: 'PUT', path: '/team-members/:id', category: 'Team Management', requiresAuth: true },
      { method: 'DELETE', path: '/team-members/:id', category: 'Team Management', requiresAuth: true },
      
      // 專案實績管理
      { method: 'GET', path: '/projects', category: 'Project Management', requiresAuth: true },
      { method: 'POST', path: '/projects', category: 'Project Management', requiresAuth: true },
      { method: 'GET', path: '/projects/:id', category: 'Project Management', requiresAuth: true },
      { method: 'PUT', path: '/projects/:id', category: 'Project Management', requiresAuth: true },
      { method: 'DELETE', path: '/projects/:id', category: 'Project Management', requiresAuth: true },
      
      // 獲獎紀錄管理
      { method: 'GET', path: '/awards', category: 'Awards Management', requiresAuth: true },
      { method: 'POST', path: '/awards', category: 'Awards Management', requiresAuth: true },
      { method: 'GET', path: '/awards/:id', category: 'Awards Management', requiresAuth: true },
      { method: 'PUT', path: '/awards/:id', category: 'Awards Management', requiresAuth: true },
      { method: 'DELETE', path: '/awards/:id', category: 'Awards Management', requiresAuth: true },
      
      // 標書範本管理
      { method: 'GET', path: '/templates', category: 'Template Management', requiresAuth: true },
      { method: 'POST', path: '/templates', category: 'Template Management', requiresAuth: true },
      { method: 'GET', path: '/templates/:id', category: 'Template Management', requiresAuth: true },
      { method: 'PUT', path: '/templates/:id', category: 'Template Management', requiresAuth: true },
      { method: 'DELETE', path: '/templates/:id', category: 'Template Management', requiresAuth: true },
      
      // 範本章節管理
      { method: 'GET', path: '/templates/:templateId/sections', category: 'Template Sections', requiresAuth: true },
      { method: 'POST', path: '/templates/:templateId/sections', category: 'Template Sections', requiresAuth: true },
      { method: 'PUT', path: '/sections/:id', category: 'Template Sections', requiresAuth: true },
      { method: 'DELETE', path: '/sections/:id', category: 'Template Sections', requiresAuth: true },
      
      // 標書管理
      { method: 'GET', path: '/proposals', category: 'Proposal Management', requiresAuth: true },
      { method: 'POST', path: '/proposals', category: 'Proposal Management', requiresAuth: true },
      { method: 'GET', path: '/proposals/:id', category: 'Proposal Management', requiresAuth: true },
      { method: 'PUT', path: '/proposals/:id', category: 'Proposal Management', requiresAuth: true },
      { method: 'DELETE', path: '/proposals/:id', category: 'Proposal Management', requiresAuth: true },
      { method: 'GET', path: '/proposals/:id/versions', category: 'Proposal Management', requiresAuth: true },
      { method: 'POST', path: '/proposals/:id/versions', category: 'Proposal Management', requiresAuth: true },
      
      // 標書生成
      { method: 'POST', path: '/generation/generate', category: 'Proposal Generation', requiresAuth: true },
      { method: 'GET', path: '/generation/status/:jobId', category: 'Proposal Generation', requiresAuth: true },
      { method: 'POST', path: '/generation/preview', category: 'Proposal Generation', requiresAuth: true },
      
      // AI 功能
      { method: 'POST', path: '/ai/generate', category: 'AI Features', requiresAuth: true },
      { method: 'POST', path: '/ai/improve', category: 'AI Features', requiresAuth: true },
      { method: 'POST', path: '/ai/translate', category: 'AI Features', requiresAuth: true },
      { method: 'POST', path: '/ai/extract-requirements', category: 'AI Features', requiresAuth: true },
      { method: 'GET', path: '/ai/usage', category: 'AI Features', requiresAuth: true },
      
      // 文件匯出
      { method: 'POST', path: '/exports/pdf', category: 'Document Export', requiresAuth: true },
      { method: 'POST', path: '/exports/word', category: 'Document Export', requiresAuth: true },
      { method: 'POST', path: '/exports/odt', category: 'Document Export', requiresAuth: true },
      { method: 'GET', path: '/exports/status/:jobId', category: 'Document Export', requiresAuth: true },
      
      // 系統功能
      { method: 'GET', path: '/health', category: 'System', requiresAuth: false },
      { method: 'GET', path: '/version', category: 'System', requiresAuth: false },
      { method: 'GET', path: '/metrics', category: 'System', requiresAuth: false }
    ];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warn': '⚠️',
      'test': '🧪'
    };
    console.log(`[${timestamp}] ${emoji[type] || 'ℹ️'} ${message}`);
  }

  async setupAuthentication() {
    this.log('設置測試認證...', 'test');
    
    try {
      // 創建測試用戶
      const registerData = {
        email: `api-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        companyName: 'API測試公司'
      };

      await axios.post(`${this.baseURL}/auth/register`, registerData);
      
      // 登入獲取 token
      const loginResponse = await axios.post(`${this.baseURL}/auth/login`, {
        email: registerData.email,
        password: registerData.password
      });

      this.authToken = loginResponse.data.data.token;
      this.log('✅ 測試用戶認證設置成功', 'success');
      return true;
    } catch (error) {
      this.log(`❌ 認證設置失敗: ${error.message}`, 'error');
      return false;
    }
  }

  async createTestData() {
    if (!this.authToken) return false;

    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    try {
      // 創建測試團隊成員
      const memberResponse = await axios.post(`${this.baseURL}/team-members`, {
        name: '測試成員',
        position: '測試職位',
        department: '測試部門',
        email: 'test-member@example.com',
        phone: '0912345678',
        expertise: ['測試技能']
      }, { headers });

      this.testMemberId = memberResponse.data.data.id;

      // 創建測試專案
      const projectResponse = await axios.post(`${this.baseURL}/projects`, {
        name: '測試專案',
        client: '測試客戶',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        budget: 1000000,
        description: '這是一個測試專案',
        technologies: ['React', 'Node.js'],
        teamSize: 5,
        achievements: ['測試成果1', '測試成果2']
      }, { headers });

      this.testProjectId = projectResponse.data.data.id;

      // 創建測試範本
      const templateResponse = await axios.post(`${this.baseURL}/templates`, {
        name: '測試範本',
        description: '測試範本描述',
        category: 'technology',
        isDefault: false
      }, { headers });

      this.testTemplateId = templateResponse.data.data.id;

      this.log('✅ 測試資料創建成功', 'success');
      return true;
    } catch (error) {
      this.log(`⚠️  測試資料創建部分失敗: ${error.message}`, 'warn');
      return false;
    }
  }

  async testEndpoint(endpoint) {
    const headers = endpoint.requiresAuth ? { Authorization: `Bearer ${this.authToken}` } : {};
    let url = `${this.baseURL}${endpoint.path}`;
    let testData = {};

    // 替換路徑參數
    if (url.includes(':id')) {
      url = url.replace(':id', this.testMemberId || '1');
    }
    if (url.includes(':templateId')) {
      url = url.replace(':templateId', this.testTemplateId || '1');
    }
    if (url.includes(':jobId')) {
      url = url.replace(':jobId', 'test-job-123');
    }

    // 準備測試資料
    switch (endpoint.category) {
      case 'Authentication':
        if (endpoint.path === '/auth/register') {
          testData = {
            email: `test-${Date.now()}@example.com`,
            password: 'TestPassword123!',
            companyName: '測試公司'
          };
        } else if (endpoint.path === '/auth/login') {
          testData = {
            email: 'test@example.com',
            password: 'wrongpassword'
          };
        }
        break;
      
      case 'Company Management':
        testData = {
          name: '更新後的公司名稱',
          taxId: '12345678',
          address: '測試地址',
          phone: '02-1234-5678',
          email: 'info@test.com',
          website: 'https://test.com',
          description: '測試公司描述'
        };
        break;
      
      case 'Team Management':
        testData = {
          name: '新團隊成員',
          position: '工程師',
          department: 'IT部',
          email: 'new-member@example.com',
          phone: '0987654321',
          expertise: ['JavaScript', 'React']
        };
        break;
      
      case 'AI Features':
        if (endpoint.path === '/ai/generate') {
          testData = {
            type: 'generate',
            prompt: '生成一段公司介紹',
            context: { companyType: '科技公司' }
          };
        } else if (endpoint.path === '/ai/improve') {
          testData = {
            content: '我們是一家很好的公司',
            type: 'improve'
          };
        } else if (endpoint.path === '/ai/translate') {
          testData = {
            content: '這是需要翻譯的內容',
            targetLanguage: 'en'
          };
        }
        break;
      
      case 'Document Export':
        testData = {
          proposalId: 'test-proposal-123',
          format: endpoint.path.includes('pdf') ? 'pdf' : endpoint.path.includes('word') ? 'docx' : 'odt'
        };
        break;
    }

    try {
      let response;
      const config = { headers, timeout: 10000 };

      switch (endpoint.method) {
        case 'GET':
          response = await axios.get(url, config);
          break;
        case 'POST':
          response = await axios.post(url, testData, config);
          break;
        case 'PUT':
          response = await axios.put(url, testData, config);
          break;
        case 'DELETE':
          response = await axios.delete(url, config);
          break;
        default:
          throw new Error(`不支援的 HTTP 方法: ${endpoint.method}`);
      }

      return {
        success: true,
        status: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown',
        dataSize: JSON.stringify(response.data).length
      };

    } catch (error) {
      const isExpectedError = [401, 403, 404, 422, 400].includes(error.response?.status);
      
      return {
        success: isExpectedError, // 某些錯誤狀態碼是預期的
        status: error.response?.status || 0,
        error: error.message,
        isExpected: isExpectedError
      };
    }
  }

  async runEndpointTests() {
    this.log('開始 API 端點功能測試...', 'test');
    
    const results = {
      total: this.apiEndpoints.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      categories: {}
    };

    for (const endpoint of this.apiEndpoints) {
      const testName = `${endpoint.method} ${endpoint.path}`;
      this.log(`測試: ${testName}`);

      if (endpoint.requiresAuth && !this.authToken) {
        this.log(`⏭️  跳過 ${testName} (需要認證)`, 'warn');
        results.skipped++;
        continue;
      }

      const result = await this.testEndpoint(endpoint);
      
      if (!results.categories[endpoint.category]) {
        results.categories[endpoint.category] = { total: 0, passed: 0, failed: 0 };
      }
      results.categories[endpoint.category].total++;

      if (result.success) {
        this.log(`✅ ${testName} - 狀態: ${result.status}`, 'success');
        results.passed++;
        results.categories[endpoint.category].passed++;
      } else {
        const message = result.isExpected ? 
          `⚠️  ${testName} - 預期錯誤: ${result.status}` :
          `❌ ${testName} - 失敗: ${result.error}`;
        this.log(message, result.isExpected ? 'warn' : 'error');
        
        if (result.isExpected) {
          results.passed++;
          results.categories[endpoint.category].passed++;
        } else {
          results.failed++;
          results.categories[endpoint.category].failed++;
        }
      }

      this.testResults.push({
        endpoint: testName,
        category: endpoint.category,
        ...result,
        timestamp: new Date().toISOString()
      });

      // 在測試之間稍作暫停
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  async checkAPIDocumentation() {
    this.log('檢查 API 文檔...', 'test');
    
    try {
      // 檢查是否有 Swagger/OpenAPI 文檔
      const swaggerEndpoints = ['/docs', '/swagger', '/api-docs', '/documentation'];
      
      for (const endpoint of swaggerEndpoints) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}`);
          if (response.status === 200) {
            this.log(`✅ 找到 API 文檔: ${endpoint}`, 'success');
            return true;
          }
        } catch (error) {
          // 繼續檢查下一個端點
        }
      }

      this.log(`⚠️  未找到 API 文檔端點`, 'warn');
      return false;
    } catch (error) {
      this.log(`❌ API 文檔檢查失敗: ${error.message}`, 'error');
      return false;
    }
  }

  async generateAPIReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: testResults,
      categories: Object.keys(testResults.categories).map(category => ({
        name: category,
        ...testResults.categories[category],
        successRate: `${((testResults.categories[category].passed / testResults.categories[category].total) * 100).toFixed(1)}%`
      })),
      endpoints: this.testResults,
      recommendations: []
    };

    // 生成建議
    if (testResults.failed > 0) {
      const failedEndpoints = this.testResults.filter(r => !r.success && !r.isExpected);
      report.recommendations.push({
        priority: 'high',
        message: `${testResults.failed} 個 API 端點存在問題需要修復`,
        details: failedEndpoints.map(e => e.endpoint)
      });
    }

    if (testResults.skipped > 0) {
      report.recommendations.push({
        priority: 'medium',
        message: `${testResults.skipped} 個端點因認證問題被跳過`,
        details: '確保認證機制正常運作'
      });
    }

    const reportPath = path.join(process.cwd(), 'api-endpoints-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n📊 API 端點測試完成結果:`);
    this.log(`🚀 總端點數: ${testResults.total}`);
    this.log(`✅ 通過: ${testResults.passed}`);
    this.log(`❌ 失敗: ${testResults.failed}`);
    this.log(`⏭️  跳過: ${testResults.skipped}`);
    this.log(`🎯 成功率: ${((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1)}%`);
    this.log(`📋 詳細報告: ${reportPath}`);

    Object.entries(testResults.categories).forEach(([category, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      this.log(`  📁 ${category}: ${stats.passed}/${stats.total} (${successRate}%)`);
    });

    return report;
  }

  async runFullAPICheck() {
    try {
      this.log('🚀 開始 API 端點功能完整檢查...');
      
      // 設置認證
      const authSetup = await this.setupAuthentication();
      if (authSetup) {
        await this.createTestData();
      }

      // 執行端點測試
      const testResults = await this.runEndpointTests();
      
      // 檢查 API 文檔
      await this.checkAPIDocumentation();
      
      // 生成報告
      const report = await this.generateAPIReport(testResults);
      
      const successRate = (testResults.passed / (testResults.total - testResults.skipped)) * 100;
      
      if (successRate >= 90) {
        this.log('🎉 API 端點功能檢查優秀！', 'success');
        return 0;
      } else if (successRate >= 75) {
        this.log('⚡ API 端點功能基本正常，部分需要改進', 'warn');
        return 0;
      } else {
        this.log('🚨 API 端點存在較多問題，需要修復', 'error');
        return 1;
      }
      
    } catch (error) {
      this.log(`❌ API 端點檢查執行失敗: ${error.message}`, 'error');
      return 1;
    }
  }
}

// 執行檢查
if (require.main === module) {
  const checker = new APIEndpointsChecker();
  checker.runFullAPICheck()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('API 端點檢查執行失敗:', error);
      process.exit(1);
    });
}

module.exports = APIEndpointsChecker;