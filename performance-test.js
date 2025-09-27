#!/usr/bin/env node

/**
 * 智能標案產生器 - 效能基準測試
 * 系統整合專員 - T066 實作
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.testResults = [];
    this.authToken = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async measureApiResponse(endpoint, method = 'GET', data = null, headers = {}) {
    const startTime = Date.now();
    
    try {
      let response;
      switch (method.toLowerCase()) {
        case 'get':
          response = await axios.get(`${this.baseURL}${endpoint}`, { headers });
          break;
        case 'post':
          response = await axios.post(`${this.baseURL}${endpoint}`, data, { headers });
          break;
        case 'put':
          response = await axios.put(`${this.baseURL}${endpoint}`, data, { headers });
          break;
        default:
          throw new Error(`不支援的 HTTP 方法: ${method}`);
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        responseTime,
        statusCode: response.status,
        dataSize: JSON.stringify(response.data).length
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: false,
        responseTime,
        error: error.message,
        statusCode: error.response?.status || 0
      };
    }
  }

  async setupTestData() {
    // 創建測試用戶並獲取 token
    const registerData = {
      email: `perf-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      companyName: '效能測試公司'
    };

    try {
      await axios.post(`${this.baseURL}/auth/register`, registerData);
      const loginResponse = await axios.post(`${this.baseURL}/auth/login`, {
        email: registerData.email,
        password: registerData.password
      });
      
      this.authToken = loginResponse.data.data.token;
      this.log('測試用戶建立成功');
    } catch (error) {
      this.log(`測試用戶建立失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  async runApiPerformanceTests() {
    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    const apiTests = [
      {
        name: '健康檢查',
        endpoint: '/health',
        method: 'GET',
        target: 500, // 500ms 目標
      },
      {
        name: '用戶登入',
        endpoint: '/auth/login',
        method: 'POST',
        data: {
          email: `perf-test-${Date.now()}@example.com`,
          password: 'TestPassword123!'
        },
        target: 1000, // 1s 目標
      },
      {
        name: '公司資料查詢',
        endpoint: '/companies/basic',
        method: 'GET',
        headers,
        target: 800, // 800ms 目標
      },
      {
        name: '團隊成員列表',
        endpoint: '/team-members',
        method: 'GET',
        headers,
        target: 1000, // 1s 目標
      },
      {
        name: '專案實績列表',
        endpoint: '/projects',
        method: 'GET',
        headers,
        target: 1200, // 1.2s 目標
      },
      {
        name: '範本列表查詢',
        endpoint: '/templates',
        method: 'GET',
        headers,
        target: 800, // 800ms 目標
      },
      {
        name: 'AI 內容生成',
        endpoint: '/ai/generate',
        method: 'POST',
        data: {
          type: 'generate',
          prompt: '生成簡短的公司介紹',
          context: { companyType: '科技公司' }
        },
        headers,
        target: 8000, // 8s 目標 (AI 生成較慢)
      }
    ];

    this.log('開始 API 效能測試...');
    const results = [];

    for (const test of apiTests) {
      this.log(`測試: ${test.name}`);
      
      // 執行多次測試以獲得平均值
      const iterations = 5;
      const measurements = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await this.measureApiResponse(
          test.endpoint,
          test.method,
          test.data,
          test.headers || {}
        );
        measurements.push(result);
        
        // 在測試間稍作暫停
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 計算統計數據
      const successfulMeasurements = measurements.filter(m => m.success);
      const responseTimes = successfulMeasurements.map(m => m.responseTime);
      
      if (responseTimes.length === 0) {
        this.log(`❌ ${test.name} - 所有請求都失敗`, 'error');
        continue;
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const minResponseTime = Math.min(...responseTimes);
      const maxResponseTime = Math.max(...responseTimes);
      const successRate = (successfulMeasurements.length / iterations) * 100;

      const testResult = {
        name: test.name,
        endpoint: test.endpoint,
        method: test.method,
        target: test.target,
        avgResponseTime: Math.round(avgResponseTime),
        minResponseTime,
        maxResponseTime,
        successRate,
        passed: avgResponseTime <= test.target && successRate === 100
      };

      results.push(testResult);

      const status = testResult.passed ? '✅' : '❌';
      this.log(
        `${status} ${test.name}: 平均 ${testResult.avgResponseTime}ms ` +
        `(目標: ${test.target}ms, 成功率: ${successRate}%)`
      );
    }

    return results;
  }

  async runLoadTest() {
    this.log('開始負載測試...');
    
    const headers = { Authorization: `Bearer ${this.authToken}` };
    const concurrentUsers = 10;
    const testDuration = 30000; // 30 秒
    const endpoint = '/companies/basic';
    
    const results = [];
    const startTime = Date.now();
    
    // 創建並發請求
    const promises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const userResults = [];
      
      while (Date.now() - startTime < testDuration) {
        const result = await this.measureApiResponse(endpoint, 'GET', null, headers);
        userResults.push({
          timestamp: Date.now(),
          userIndex,
          ...result
        });
        
        // 每個用戶之間的請求間隔
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return userResults;
    });

    const allResults = (await Promise.all(promises)).flat();
    
    // 分析負載測試結果
    const successfulRequests = allResults.filter(r => r.success);
    const responseTimes = successfulRequests.map(r => r.responseTime);
    
    const loadTestResult = {
      totalRequests: allResults.length,
      successfulRequests: successfulRequests.length,
      failedRequests: allResults.length - successfulRequests.length,
      successRate: (successfulRequests.length / allResults.length) * 100,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: allResults.length / (testDuration / 1000),
      concurrentUsers
    };

    this.log(
      `負載測試結果: ${loadTestResult.successfulRequests}/${loadTestResult.totalRequests} 成功 ` +
      `(${loadTestResult.successRate.toFixed(1)}%), 平均響應: ${loadTestResult.avgResponseTime.toFixed(0)}ms, ` +
      `RPS: ${loadTestResult.requestsPerSecond.toFixed(1)}`
    );

    return loadTestResult;
  }

  async runMemoryLeakTest() {
    this.log('開始記憶體洩漏測試...');
    
    const headers = { Authorization: `Bearer ${this.authToken}` };
    const iterations = 100;
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
      // 執行一系列 API 調用
      await this.measureApiResponse('/companies/basic', 'GET', null, headers);
      await this.measureApiResponse('/team-members', 'GET', null, headers);
      await this.measureApiResponse('/projects', 'GET', null, headers);
      
      // 記錄記憶體使用情況 (如果在 Node.js 環境中)
      if (typeof process !== 'undefined') {
        const memUsage = process.memoryUsage();
        memorySnapshots.push({
          iteration: i,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        });
      }
      
      if (i % 20 === 0) {
        this.log(`記憶體測試進度: ${i}/${iterations}`);
      }
    }

    // 分析記憶體趨勢
    if (memorySnapshots.length > 0) {
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      
      const heapGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
      const heapGrowthPercentage = (heapGrowth / firstSnapshot.heapUsed) * 100;
      
      this.log(
        `記憶體分析: 堆記憶體增長 ${(heapGrowth / 1024 / 1024).toFixed(2)}MB ` +
        `(${heapGrowthPercentage.toFixed(1)}%)`
      );

      return {
        iterations,
        initialHeapUsed: firstSnapshot.heapUsed,
        finalHeapUsed: lastSnapshot.heapUsed,
        heapGrowth,
        heapGrowthPercentage,
        potentialLeak: heapGrowthPercentage > 50 // 如果增長超過50%可能有洩漏
      };
    }

    return null;
  }

  async generateReport(apiResults, loadTestResult, memoryTestResult) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        apiTestsPassed: apiResults.filter(r => r.passed).length,
        apiTestsTotal: apiResults.length,
        loadTestSuccessRate: loadTestResult.successRate,
        memoryLeakDetected: memoryTestResult?.potentialLeak || false
      },
      apiPerformance: apiResults,
      loadTest: loadTestResult,
      memoryTest: memoryTestResult,
      recommendations: []
    };

    // 生成建議
    const slowApis = apiResults.filter(r => !r.passed);
    if (slowApis.length > 0) {
      report.recommendations.push({
        type: 'performance',
        message: `以下 API 端點需要優化: ${slowApis.map(r => r.name).join(', ')}`
      });
    }

    if (loadTestResult.successRate < 95) {
      report.recommendations.push({
        type: 'reliability',
        message: '負載測試成功率偏低，需要檢查系統穩定性'
      });
    }

    if (memoryTestResult?.potentialLeak) {
      report.recommendations.push({
        type: 'memory',
        message: '檢測到潛在的記憶體洩漏，需要進一步調查'
      });
    }

    // 保存報告
    const reportPath = path.join(__dirname, 'performance-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n📊 效能測試完成結果:`);
    this.log(`🚀 API 測試: ${report.summary.apiTestsPassed}/${report.summary.apiTestsTotal} 通過`);
    this.log(`⚡ 負載測試成功率: ${report.summary.loadTestSuccessRate.toFixed(1)}%`);
    this.log(`🧠 記憶體洩漏: ${report.summary.memoryLeakDetected ? '檢測到' : '無檢測到'}`);
    this.log(`📋 詳細報告: ${reportPath}`);

    return report;
  }

  async runAllTests() {
    try {
      this.log('🚀 開始效能基準測試');
      
      await this.setupTestData();
      
      const apiResults = await this.runApiPerformanceTests();
      const loadTestResult = await this.runLoadTest();
      const memoryTestResult = await this.runMemoryLeakTest();
      
      const report = await this.generateReport(apiResults, loadTestResult, memoryTestResult);
      
      if (report.summary.apiTestsPassed === report.summary.apiTestsTotal && 
          report.summary.loadTestSuccessRate > 95 && 
          !report.summary.memoryLeakDetected) {
        this.log('🎉 所有效能測試通過！系統效能良好', 'success');
        return 0;
      } else {
        this.log('⚠️  部分效能測試未達標，需要優化', 'warn');
        return 1;
      }
      
    } catch (error) {
      this.log(`效能測試執行失敗: ${error.message}`, 'error');
      return 1;
    }
  }
}

// 執行測試
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('效能測試執行失敗:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTester;