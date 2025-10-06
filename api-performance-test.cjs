#!/usr/bin/env node

/**
 * API 性能與錯誤處理測試
 * 系統整合專員測試工具
 */

const axios = require('axios');

class APIPerformanceTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.results = [];
  }

  async measureAPI(name, testFn) {
    const start = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      this.results.push({
        name,
        status: 'success',
        duration,
        result
      });
      console.log(`✅ ${name}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.results.push({
        name,
        status: 'error',
        duration,
        error: error.response ? {
          status: error.response.status,
          message: error.response.data?.message || error.message
        } : error.message
      });
      console.log(`❌ ${name}: ${duration}ms - ${error.message}`);
      throw error;
    }
  }

  async testAPIResponses() {
    console.log('🚀 開始 API 性能與錯誤處理測試\n');

    // 健康檢查
    await this.measureAPI('健康檢查', async () => {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    });

    // API 信息端點
    await this.measureAPI('API 信息', async () => {
      const response = await axios.get(`${this.baseURL}/api/v1`);
      return response.data;
    });

    // 無認證訪問測試
    await this.measureAPI('未認證訪問 (預期 401)', async () => {
      try {
        await axios.get(`${this.baseURL}/api/v1/companies/basic`);
      } catch (error) {
        if (error.response?.status === 401) {
          return { expected: true, status: 401 };
        }
        throw error;
      }
    });

    // 無效路由測試
    await this.measureAPI('無效路由 (預期 404)', async () => {
      try {
        await axios.get(`${this.baseURL}/api/v1/nonexistent`);
      } catch (error) {
        if (error.response?.status === 404) {
          return { expected: true, status: 404 };
        }
        throw error;
      }
    });

    // 無效 HTTP 方法測試
    await this.measureAPI('無效方法 (預期 405/404)', async () => {
      try {
        await axios.patch(`${this.baseURL}/health`);
      } catch (error) {
        if (error.response?.status >= 400) {
          return { expected: true, status: error.response.status };
        }
        throw error;
      }
    });

    // 大型請求測試
    await this.measureAPI('大型請求處理', async () => {
      const largeData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        largeField: 'x'.repeat(1000) // 1KB 字段
      };
      
      try {
        await axios.post(`${this.baseURL}/api/v1/auth/login`, largeData);
      } catch (error) {
        // 預期會失敗，但應該正確處理
        if (error.response?.status >= 400) {
          return { handled: true, status: error.response.status };
        }
        throw error;
      }
    });

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 性能與錯誤處理測試報告');
    console.log('=' .repeat(50));

    const successfulTests = this.results.filter(r => r.status === 'success');
    const errorTests = this.results.filter(r => r.status === 'error');

    console.log(`總測試數: ${this.results.length}`);
    console.log(`成功: ${successfulTests.length}`);
    console.log(`錯誤: ${errorTests.length}`);

    if (successfulTests.length > 0) {
      const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
      const maxDuration = Math.max(...successfulTests.map(r => r.duration));
      const minDuration = Math.min(...successfulTests.map(r => r.duration));

      console.log('\n🚀 性能統計:');
      console.log(`平均響應時間: ${avgDuration.toFixed(2)}ms`);
      console.log(`最長響應時間: ${maxDuration}ms`);
      console.log(`最短響應時間: ${minDuration}ms`);
    }

    console.log('\n🔍 詳細結果:');
    this.results.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.duration}ms`);
      if (result.error) {
        console.log(`   錯誤: ${JSON.stringify(result.error)}`);
      }
    });

    // 檢查響應時間要求
    console.log('\n📏 性能標準檢查:');
    const slowResponses = this.results.filter(r => r.duration > 2000);
    if (slowResponses.length === 0) {
      console.log('✅ 所有 API 響應時間 < 2 秒');
    } else {
      console.log(`❌ ${slowResponses.length} 個 API 響應時間 > 2 秒`);
      slowResponses.forEach(r => {
        console.log(`   - ${r.name}: ${r.duration}ms`);
      });
    }
  }
}

// 執行測試
if (require.main === module) {
  const tester = new APIPerformanceTester();
  tester.testAPIResponses()
    .then(() => {
      console.log('\n🎉 API 性能測試完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 測試執行失敗:', error);
      process.exit(1);
    });
}

module.exports = APIPerformanceTester;