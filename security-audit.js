#!/usr/bin/env node

/**
 * 智能標案產生器 - 安全性審計檢查
 * 系統整合專員 - T067 實作
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAuditor {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.vulnerabilities = [];
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SECURITY-${type.toUpperCase()}] ${message}`);
  }

  addVulnerability(severity, category, description, recommendation) {
    this.vulnerabilities.push({
      severity,
      category,
      description,
      recommendation,
      timestamp: new Date().toISOString()
    });
  }

  async testSQLInjection() {
    this.log('檢查 SQL 注入漏洞...');
    
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#"
    ];

    const testEndpoints = [
      '/auth/login',
      '/companies/basic',
      '/team-members',
      '/projects'
    ];

    let vulnerabilityFound = false;

    for (const endpoint of testEndpoints) {
      for (const payload of sqlPayloads) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            email: payload,
            password: payload,
            search: payload
          }, { timeout: 5000 });

          // 檢查是否有異常響應
          if (response.data && response.data.toString().includes('Error:')) {
            vulnerabilityFound = true;
            this.addVulnerability(
              'HIGH',
              'SQL Injection',
              `端點 ${endpoint} 可能存在 SQL 注入漏洞`,
              '使用參數化查詢並驗證所有輸入'
            );
          }
        } catch (error) {
          // 檢查錯誤訊息是否洩露數據庫資訊
          if (error.response?.data?.message?.includes('SQL') ||
              error.response?.data?.message?.includes('database')) {
            vulnerabilityFound = true;
            this.addVulnerability(
              'MEDIUM',
              'Information Disclosure',
              `端點 ${endpoint} 洩露數據庫錯誤訊息`,
              '隱藏詳細的錯誤訊息，只返回通用錯誤'
            );
          }
        }
      }
    }

    this.log(vulnerabilityFound ? '❌ 發現 SQL 注入相關問題' : '✅ SQL 注入檢查通過');
  }

  async testXSSVulnerabilities() {
    this.log('檢查 XSS 漏洞...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '<svg/onload=alert("XSS")>'
    ];

    // 測試用戶輸入端點
    const testData = {
      name: '<script>alert("XSS")</script>',
      description: 'javascript:alert("XSS")',
      content: '<img src="x" onerror="alert(\'XSS\')">'
    };

    try {
      // 註冊測試用戶
      const registerResponse = await axios.post(`${this.baseURL}/auth/register`, {
        email: `xss-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        companyName: testData.name
      });

      // 檢查響應是否包含未轉義的腳本
      const responseText = JSON.stringify(registerResponse.data);
      if (responseText.includes('<script>') || responseText.includes('javascript:')) {
        this.addVulnerability(
          'HIGH',
          'Cross-Site Scripting (XSS)',
          '用戶輸入未經適當轉義，可能導致 XSS 攻擊',
          '對所有用戶輸入進行 HTML 編碼和驗證'
        );
      }
    } catch (error) {
      // 檢查錯誤響應中是否有 XSS 風險
      if (error.response?.data && JSON.stringify(error.response.data).includes('<script>')) {
        this.addVulnerability(
          'HIGH',
          'Cross-Site Scripting (XSS)',
          '錯誤訊息中包含未轉義的用戶輸入',
          '對錯誤訊息中的用戶輸入進行適當轉義'
        );
      }
    }

    this.log('✅ XSS 漏洞檢查完成');
  }

  async testAuthenticationSecurity() {
    this.log('檢查認證安全性...');
    
    // 測試弱密碼
    const weakPasswords = ['123456', 'password', 'admin', '123', 'qwerty'];
    
    for (const weakPassword of weakPasswords) {
      try {
        await axios.post(`${this.baseURL}/auth/register`, {
          email: `weak-pass-test-${Date.now()}@example.com`,
          password: weakPassword,
          companyName: '測試公司'
        });
        
        this.addVulnerability(
          'MEDIUM',
          'Weak Password Policy',
          `系統接受弱密碼: ${weakPassword}`,
          '實施強密碼政策：至少8位字符，包含大小寫字母、數字和特殊字符'
        );
      } catch (error) {
        // 這是預期的結果
      }
    }

    // 測試暴力破解保護
    const testEmail = `brute-force-test-${Date.now()}@example.com`;
    
    // 先註冊用戶
    try {
      await axios.post(`${this.baseURL}/auth/register`, {
        email: testEmail,
        password: 'ValidPassword123!',
        companyName: '測試公司'
      });
    } catch (error) {
      // 忽略註冊錯誤
    }

    // 嘗試多次失敗登入
    let attemptCount = 0;
    for (let i = 0; i < 10; i++) {
      try {
        await axios.post(`${this.baseURL}/auth/login`, {
          email: testEmail,
          password: 'wrongpassword'
        });
      } catch (error) {
        attemptCount++;
        if (i === 9 && error.response?.status !== 429) {
          this.addVulnerability(
            'MEDIUM',
            'Brute Force Protection',
            '缺乏暴力破解保護機制',
            '實施帳戶鎖定和速率限制'
          );
        }
      }
    }

    this.log('✅ 認證安全性檢查完成');
  }

  async testJWTSecurity() {
    this.log('檢查 JWT 安全性...');
    
    try {
      // 註冊並獲取 JWT
      const email = `jwt-test-${Date.now()}@example.com`;
      await axios.post(`${this.baseURL}/auth/register`, {
        email,
        password: 'TestPassword123!',
        companyName: '測試公司'
      });

      const loginResponse = await axios.post(`${this.baseURL}/auth/login`, {
        email,
        password: 'TestPassword123!'
      });

      const token = loginResponse.data.data.token;
      
      if (!token) {
        this.addVulnerability(
          'HIGH',
          'JWT Implementation',
          'JWT token 未正確返回',
          '確保 JWT 實施正確'
        );
        return;
      }

      // 分析 JWT 結構
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        this.addVulnerability(
          'HIGH',
          'JWT Format',
          'JWT token 格式不正確',
          '使用標準的 JWT 格式'
        );
        return;
      }

      // 檢查 JWT payload（不解密，只檢查是否包含敏感訊息）
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        
        if (payload.password || payload.secret) {
          this.addVulnerability(
            'HIGH',
            'JWT Payload Security',
            'JWT payload 包含敏感訊息',
            '從 JWT payload 中移除敏感訊息'
          );
        }

        if (!payload.exp) {
          this.addVulnerability(
            'MEDIUM',
            'JWT Expiration',
            'JWT token 沒有設置過期時間',
            '為 JWT 設置適當的過期時間'
          );
        }
      } catch (error) {
        // JWT payload 可能已加密，這是好的
      }

      // 測試 token 篡改
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      try {
        await axios.get(`${this.baseURL}/companies/basic`, {
          headers: { Authorization: `Bearer ${tamperedToken}` }
        });
        
        this.addVulnerability(
          'HIGH',
          'JWT Verification',
          'JWT token 驗證機制存在問題',
          '確保正確驗證 JWT 簽名'
        );
      } catch (error) {
        // 這是預期的結果
      }

    } catch (error) {
      this.log(`JWT 安全性測試錯誤: ${error.message}`, 'error');
    }

    this.log('✅ JWT 安全性檢查完成');
  }

  async testHTTPSecurity() {
    this.log('檢查 HTTP 安全性...');
    
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      const headers = response.headers;

      // 檢查安全標頭
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'content-security-policy': true
      };

      Object.entries(securityHeaders).forEach(([header, expectedValue]) => {
        if (!headers[header]) {
          this.addVulnerability(
            'MEDIUM',
            'Missing Security Headers',
            `缺少安全標頭: ${header}`,
            `添加 ${header} 標頭以增強安全性`
          );
        } else if (expectedValue !== true && headers[header] !== expectedValue) {
          this.addVulnerability(
            'LOW',
            'Security Header Configuration',
            `安全標頭 ${header} 配置可能不夠安全`,
            `建議設置為: ${expectedValue}`
          );
        }
      });

      // 檢查是否洩露服務器訊息
      if (headers['server'] && headers['server'].includes('Express')) {
        this.addVulnerability(
          'LOW',
          'Information Disclosure',
          '服務器標頭洩露技術細節',
          '隱藏或修改服務器標頭訊息'
        );
      }

    } catch (error) {
      this.log(`HTTP 安全性測試錯誤: ${error.message}`, 'error');
    }

    this.log('✅ HTTP 安全性檢查完成');
  }

  async testInputValidation() {
    this.log('檢查輸入驗證...');
    
    const maliciousInputs = [
      { type: 'oversized', value: 'A'.repeat(10000) },
      { type: 'null_bytes', value: 'test\x00.txt' },
      { type: 'unicode', value: '🚀💥\uFEFF' },
      { type: 'path_traversal', value: '../../../etc/passwd' },
      { type: 'command_injection', value: '; rm -rf /' }
    ];

    for (const input of maliciousInputs) {
      try {
        await axios.post(`${this.baseURL}/auth/register`, {
          email: `${input.value}@example.com`,
          password: input.value,
          companyName: input.value
        });
        
        this.addVulnerability(
          'MEDIUM',
          'Input Validation',
          `系統接受了可能有害的輸入 (${input.type})`,
          '實施嚴格的輸入驗證和清理'
        );
      } catch (error) {
        // 這通常是預期的結果
      }
    }

    this.log('✅ 輸入驗證檢查完成');
  }

  async testCORSConfiguration() {
    this.log('檢查 CORS 配置...');
    
    try {
      // 測試 CORS 預檢請求
      const response = await axios.options(`${this.baseURL}/auth/login`, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const corsHeaders = response.headers;
      
      if (corsHeaders['access-control-allow-origin'] === '*') {
        this.addVulnerability(
          'MEDIUM',
          'CORS Misconfiguration',
          'CORS 允許所有來源 (*)',
          '限制 CORS 允許的來源為受信任的域名'
        );
      }

      if (corsHeaders['access-control-allow-credentials'] === 'true' && 
          corsHeaders['access-control-allow-origin'] === '*') {
        this.addVulnerability(
          'HIGH',
          'CORS Security Risk',
          'CORS 同時允許所有來源和憑證',
          '當允許憑證時，不要使用通配符來源'
        );
      }

    } catch (error) {
      // CORS 拒絕是好的
    }

    this.log('✅ CORS 配置檢查完成');
  }

  async checkFileUploadSecurity() {
    this.log('檢查文件上傳安全性...');
    
    // 創建測試文件
    const maliciousFiles = [
      { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
      { name: 'test.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
      { name: 'test.exe', content: 'MZ' + 'A'.repeat(100) },
      { name: '../../../etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash' }
    ];

    // 注意：這裡假設有文件上傳端點，實際端點可能不同
    const uploadEndpoints = ['/upload', '/files', '/documents'];

    for (const endpoint of uploadEndpoints) {
      for (const file of maliciousFiles) {
        try {
          const formData = new FormData();
          formData.append('file', new Blob([file.content]), file.name);
          
          await axios.post(`${this.baseURL}${endpoint}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          this.addVulnerability(
            'HIGH',
            'File Upload Security',
            `端點 ${endpoint} 接受了可能有害的文件: ${file.name}`,
            '實施文件類型驗證、大小限制和安全掃描'
          );
        } catch (error) {
          // 文件上傳被拒絕是好的
        }
      }
    }

    this.log('✅ 文件上傳安全性檢查完成');
  }

  async generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalVulnerabilities: this.vulnerabilities.length,
        critical: this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: this.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: this.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: this.vulnerabilities.filter(v => v.severity === 'LOW').length
      },
      vulnerabilities: this.vulnerabilities,
      recommendations: {
        immediate: this.vulnerabilities.filter(v => ['CRITICAL', 'HIGH'].includes(v.severity)),
        shortTerm: this.vulnerabilities.filter(v => v.severity === 'MEDIUM'),
        longTerm: this.vulnerabilities.filter(v => v.severity === 'LOW')
      },
      complianceChecks: {
        owasp: {
          injection: this.vulnerabilities.some(v => v.category.includes('Injection')),
          authentication: this.vulnerabilities.some(v => v.category.includes('Authentication')),
          dataExposure: this.vulnerabilities.some(v => v.category.includes('Disclosure')),
          xxe: false, // 需要 XML 端點測試
          brokenAccess: false, // 需要權限測試
          securityMisconfig: this.vulnerabilities.some(v => v.category.includes('Configuration')),
          xss: this.vulnerabilities.some(v => v.category.includes('XSS')),
          deserialize: false, // 需要序列化端點測試
          components: false, // 需要依賴掃描
          logging: false // 需要日誌測試
        }
      }
    };

    const reportPath = path.join(__dirname, 'security-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n🔒 安全性審計完成結果:`);
    this.log(`🚨 嚴重: ${report.summary.critical} 個`);
    this.log(`🔴 高危: ${report.summary.high} 個`);
    this.log(`🟡 中危: ${report.summary.medium} 個`);
    this.log(`🟢 低危: ${report.summary.low} 個`);
    this.log(`📋 詳細報告: ${reportPath}`);

    if (report.summary.critical > 0 || report.summary.high > 0) {
      this.log('⚠️  發現高危安全問題，需要立即處理', 'warn');
      return 1;
    } else if (report.summary.medium > 0) {
      this.log('⚡ 發現中等安全問題，建議盡快修復', 'warn');
      return 0;
    } else {
      this.log('🎉 未發現嚴重安全問題！', 'success');
      return 0;
    }
  }

  async runSecurityAudit() {
    try {
      this.log('🔒 開始安全性審計...');
      
      await this.testSQLInjection();
      await this.testXSSVulnerabilities();
      await this.testAuthenticationSecurity();
      await this.testJWTSecurity();
      await this.testHTTPSecurity();
      await this.testInputValidation();
      await this.testCORSConfiguration();
      await this.checkFileUploadSecurity();
      
      return await this.generateSecurityReport();
      
    } catch (error) {
      this.log(`安全性審計執行失敗: ${error.message}`, 'error');
      return 1;
    }
  }
}

// 執行安全審計
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runSecurityAudit()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('安全性審計執行失敗:', error);
      process.exit(1);
    });
}

module.exports = SecurityAuditor;