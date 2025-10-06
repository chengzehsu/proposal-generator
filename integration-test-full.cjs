#!/usr/bin/env node

/**
 * 智能標案產生器 - 完整前後端整合測試
 * 系統整合專員 - T064 實作
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IntegrationTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.frontendURL = 'http://localhost:5173';
    this.testResults = [];
    this.authToken = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, type, message });
  }

  async runTest(testName, testFn) {
    try {
      this.log(`開始測試: ${testName}`, 'test');
      await testFn();
      this.log(`✅ ${testName} - 通過`, 'pass');
      return true;
    } catch (error) {
      this.log(`❌ ${testName} - 失敗: ${error.message}`, 'fail');
      return false;
    }
  }

  async testBackendHealth() {
    const response = await axios.get(`${this.baseURL}/health`);
    if (response.status !== 200) {
      throw new Error(`後端健康檢查失敗: ${response.status}`);
    }
    this.log('後端服務正常運行');
  }

  async testAuthentication() {
    // 測試用戶註冊
    const registerData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: '測試用戶',
      company: {
        company_name: '智能科技有限公司',
        tax_id: Math.floor(Math.random() * 90000000 + 10000000).toString(),
        address: '台北市信義區信義路五段7號',
        phone: '02-1234-5678',
        email: `company-${Date.now()}@smarttech.com.tw`,
        website: 'https://smarttech.com.tw'
      }
    };

    const registerResponse = await axios.post(`${this.baseURL}/api/v1/auth/register`, registerData);
    if (registerResponse.status !== 201) {
      throw new Error('用戶註冊失敗');
    }

    // 測試用戶登入
    const loginResponse = await axios.post(`${this.baseURL}/api/v1/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });

    if (loginResponse.status !== 200 || !loginResponse.data.token) {
      throw new Error('用戶登入失敗');
    }

    this.authToken = loginResponse.data.token;
    this.log('認證流程測試通過');
  }

  async testCompanyDataAPI() {
    if (!this.authToken) throw new Error('需要先完成認證');

    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // 先獲取當前公司資料
    const getResponse = await axios.get(`${this.baseURL}/api/v1/companies/basic`, { headers });
    if (getResponse.status !== 200) {
      throw new Error('獲取公司資料失敗');
    }

    // 測試公司基本資料更新
    const companyData = {
      company_name: '智能科技有限公司',
      address: '台北市信義區信義路五段7號',
      phone: '02-1234-5678',
      email: 'info@smarttech.com.tw',
      website: 'https://smarttech.com.tw',
      version: getResponse.data.version
    };

    const response = await axios.put(`${this.baseURL}/api/v1/companies/basic`, companyData, { headers });
    if (response.status !== 200) {
      throw new Error('公司資料更新失敗');
    }

    this.log('公司資料管理 API 測試通過');
  }

  async testTeamMembersAPI() {
    if (!this.authToken) throw new Error('需要先完成認證');

    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // 測試團隊成員新增
    const memberData = {
      name: '張經理',
      title: '專案經理',
      department: '技術部',
      education: '碩士',
      experience: '10年相關經驗',
      expertise: '專案管理、AI技術、系統整合'
    };

    const response = await axios.post(`${this.baseURL}/api/v1/team-members`, memberData, { headers });
    if (response.status !== 201) {
      throw new Error('團隊成員新增失敗');
    }

    this.log('團隊成員管理 API 測試通過');
  }

  async testProjectsAPI() {
    if (!this.authToken) throw new Error('需要先完成認證');

    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // 測試專案實績新增
    const projectData = {
      project_name: '智慧城市物聯網平台開發案',
      client_name: '台北市政府',
      start_date: '2023-01-01',
      end_date: '2023-12-31',
      amount: 5000000,
      description: '建置涵蓋交通、環境、安全的智慧城市整合平台',
      tags: ['IoT', 'AI', '大數據分析', '雲端運算'],
      achievements: '提升交通效率30%、降低能耗20%、提升市民滿意度85%'
    };

    const response = await axios.post(`${this.baseURL}/api/v1/projects`, projectData, { headers });
    if (response.status !== 201) {
      throw new Error('專案實績新增失敗');
    }

    this.log('專案實績管理 API 測試通過');
  }

  async testTemplatesAPI() {
    if (!this.authToken) throw new Error('需要先完成認證');

    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // 測試範本管理
    const response = await axios.get(`${this.baseURL}/api/v1/templates`, { headers });
    if (response.status !== 200) {
      throw new Error('範本列表獲取失敗');
    }

    if (!Array.isArray(response.data)) {
      throw new Error('範本資料格式錯誤');
    }

    this.log('範本管理 API 測試通過');
  }

  async testAIGenerationAPI() {
    if (!this.authToken) throw new Error('需要先完成認證');

    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // 測試 AI 內容生成
    const aiRequest = {
      prompt: '請為智慧城市IoT平台專案撰寫技術能力說明',
      context: {
        projectType: '智慧城市',
        technologies: 'IoT, AI, 大數據',
        companyStrengths: '15年技術經驗, AI研發團隊, 成功案例豐富'
      },
      section_type: '技術方案'
    };

    const response = await axios.post(`${this.baseURL}/api/v1/ai/generate`, aiRequest, { headers });
    if (response.status !== 200) {
      throw new Error('AI 內容生成失敗');
    }

    if (!response.data.content) {
      throw new Error('AI 生成內容為空');
    }

    this.log('AI 內容生成 API 測試通過');
  }

  async testProposalWorkflow() {
    if (!this.authToken) throw new Error('需要先完成認證');

    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // 先創建一個範本
    const templateData = {
      template_name: '測試範本',
      description: '用於整合測試的範本',
      category: '政府標案'
    };
    
    const templateResponse = await axios.post(`${this.baseURL}/api/v1/templates`, templateData, { headers });
    if (templateResponse.status !== 201) {
      throw new Error('範本創建失敗');
    }
    
    const templateId = templateResponse.data.id;

    // 測試完整標書生成流程
    const proposalData = {
      proposal_title: '智慧交通管理系統建置案',
      client_name: '新北市政府',
      template_id: templateId,
      deadline: '2024-12-31',
      estimated_amount: 8000000,
      description: '建置智慧交通管理系統，提升城市交通效率'
    };

    const response = await axios.post(`${this.baseURL}/api/v1/proposals`, proposalData, { headers });
    if (response.status !== 201) {
      throw new Error('標書建立失敗');
    }

    this.log('標書工作流程測試通過');
  }

  async testFrontendConnectivity() {
    try {
      // 測試前端服務是否運行
      const response = await axios.get(this.frontendURL, { timeout: 5000 });
      if (response.status !== 200) {
        throw new Error(`前端服務異常: ${response.status}`);
      }
      this.log('前端服務連線正常');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.log('⚠️  前端服務未啟動，請執行 npm run dev:frontend', 'warn');
      } else {
        throw error;
      }
    }
  }

  async runAllTests() {
    this.log('🚀 開始執行完整前後端整合測試', 'start');
    
    const tests = [
      ['後端健康檢查', () => this.testBackendHealth()],
      ['前端連線檢查', () => this.testFrontendConnectivity()],
      ['認證流程測試', () => this.testAuthentication()],
      ['公司資料 API 測試', () => this.testCompanyDataAPI()],
      ['團隊成員 API 測試', () => this.testTeamMembersAPI()],
      ['專案實績 API 測試', () => this.testProjectsAPI()],
      ['範本管理 API 測試', () => this.testTemplatesAPI()],
      ['AI 生成 API 測試', () => this.testAIGenerationAPI()],
      ['標書工作流程測試', () => this.testProposalWorkflow()]
    ];

    let passed = 0;
    let failed = 0;

    for (const [testName, testFn] of tests) {
      const success = await this.runTest(testName, testFn);
      if (success) passed++;
      else failed++;
    }

    // 生成測試報告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: tests.length,
        passed,
        failed,
        successRate: `${((passed / tests.length) * 100).toFixed(1)}%`
      },
      results: this.testResults
    };

    const reportPath = path.join(__dirname, 'integration-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n📊 測試完成結果:`, 'summary');
    this.log(`✅ 通過: ${passed}/${tests.length}`, 'summary');
    this.log(`❌ 失敗: ${failed}/${tests.length}`, 'summary');
    this.log(`🎯 成功率: ${report.summary.successRate}`, 'summary');
    this.log(`📋 詳細報告: ${reportPath}`, 'summary');

    if (failed === 0) {
      this.log('🎉 所有整合測試通過！前後端整合狀態良好', 'success');
    } else {
      this.log('⚠️  部分測試失敗，需要檢查相關功能', 'warn');
    }

    return report;
  }
}

// 執行測試
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests()
    .then(report => {
      process.exit(report.summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('整合測試執行失敗:', error);
      process.exit(1);
    });
}

module.exports = IntegrationTester;