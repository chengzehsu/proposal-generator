#!/usr/bin/env node

/**
 * 智能標案產生器 - 前端頁面功能驗證
 * 系統整合專員 - 前端功能檢查
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class FrontendPagesChecker {
  constructor() {
    this.baseURL = 'http://localhost:5173';
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    
    this.pages = [
      // 認證頁面
      { 
        path: '/', 
        name: '登入頁面', 
        category: 'Authentication',
        expectedElements: ['input[name="email"]', 'input[name="password"]', 'button[type="submit"]'],
        actions: ['login_test']
      },
      
      // 主控台
      { 
        path: '/dashboard', 
        name: '儀表板', 
        category: 'Dashboard',
        requiresAuth: true,
        expectedElements: ['.dashboard-stats', '.recent-activities'],
        actions: ['navigation_test']
      },
      
      // 公司資料管理
      { 
        path: '/database/company', 
        name: '公司資料管理', 
        category: 'Data Management',
        requiresAuth: true,
        expectedElements: ['input[name="name"]', 'input[name="taxId"]', 'button:has-text("儲存")'],
        actions: ['form_test']
      },
      
      // 團隊成員管理
      { 
        path: '/database/team', 
        name: '團隊成員管理', 
        category: 'Data Management',
        requiresAuth: true,
        expectedElements: ['.team-members-table', 'button:has-text("新增成員")'],
        actions: ['table_test', 'crud_test']
      },
      
      // 專案實績管理
      { 
        path: '/database/projects', 
        name: '專案實績管理', 
        category: 'Data Management',
        requiresAuth: true,
        expectedElements: ['.projects-table', 'button:has-text("新增專案")'],
        actions: ['table_test', 'crud_test']
      },
      
      // 範本管理
      { 
        path: '/templates', 
        name: '範本管理', 
        category: 'Template Management',
        requiresAuth: true,
        expectedElements: ['.template-grid', '.template-card'],
        actions: ['template_selection']
      },
      
      // 標案編輯器
      { 
        path: '/editor', 
        name: '標案編輯器', 
        category: 'Proposal Editor',
        requiresAuth: true,
        expectedElements: ['.tiptap-editor', 'button:has-text("AI 生成")'],
        actions: ['editor_test', 'ai_integration']
      },
      
      // AI 功能頁面
      { 
        path: '/ai/improve', 
        name: 'AI 內容改善', 
        category: 'AI Features',
        requiresAuth: true,
        expectedElements: ['textarea[name="content"]', 'button:has-text("改善內容")'],
        actions: ['ai_test']
      },
      
      { 
        path: '/ai/translate', 
        name: 'AI 翻譯', 
        category: 'AI Features',
        requiresAuth: true,
        expectedElements: ['textarea[name="content"]', 'select[name="targetLanguage"]'],
        actions: ['ai_test']
      },
      
      { 
        path: '/ai/extract-requirements', 
        name: 'AI 需求提取', 
        category: 'AI Features',
        requiresAuth: true,
        expectedElements: ['textarea[name="content"]', 'button:has-text("提取需求")'],
        actions: ['ai_test']
      },
      
      { 
        path: '/ai/usage', 
        name: 'AI 使用監控', 
        category: 'AI Features',
        requiresAuth: true,
        expectedElements: ['.usage-charts', '.usage-statistics'],
        actions: ['data_visualization']
      },
      
      // 文件匯出
      { 
        path: '/export', 
        name: '文件匯出', 
        category: 'Document Export',
        requiresAuth: true,
        expectedElements: ['button:has-text("匯出 PDF")', 'button:has-text("匯出 Word")'],
        actions: ['export_test']
      }
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

  async initBrowser() {
    this.log('啟動瀏覽器...', 'test');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    
    // 設置視窗大小
    await this.page.setViewport({ width: 1366, height: 768 });
    
    // 設置用戶代理
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    this.log('✅ 瀏覽器啟動成功', 'success');
  }

  async performLogin() {
    this.log('執行登入流程...', 'test');
    
    try {
      await this.page.goto(`${this.baseURL}/`, { waitUntil: 'networkidle0' });
      
      // 檢查是否有註冊連結，如果有則先註冊
      const registerButton = await this.page.$('text=註冊');
      if (registerButton) {
        await registerButton.click();
        await this.page.waitForTimeout(1000);
        
        // 填寫註冊表單
        const timestamp = Date.now();
        await this.page.fill('input[name="email"]', `frontend-test-${timestamp}@example.com`);
        await this.page.fill('input[name="password"]', 'TestPassword123!');
        await this.page.fill('input[name="confirmPassword"]', 'TestPassword123!');
        await this.page.fill('input[name="companyName"]', '前端測試公司');
        
        await this.page.click('button[type="submit"]');
        await this.page.waitForTimeout(3000);
        
        // 檢查是否成功跳轉到儀表板
        const currentUrl = this.page.url();
        if (currentUrl.includes('/dashboard')) {
          this.log('✅ 用戶註冊並登入成功', 'success');
          return true;
        }
      } else {
        // 嘗試登入已存在的用戶
        await this.page.fill('input[name="email"]', 'test@example.com');
        await this.page.fill('input[name="password"]', 'TestPassword123!');
        await this.page.click('button[type="submit"]');
        await this.page.waitForTimeout(3000);
      }
      
      return true;
    } catch (error) {
      this.log(`❌ 登入失敗: ${error.message}`, 'error');
      return false;
    }
  }

  async takeScreenshot(pageName) {
    try {
      const screenshotPath = path.join(process.cwd(), 'screenshots', `${pageName.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
      
      // 確保截圖目錄存在
      const screenshotDir = path.dirname(screenshotPath);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        quality: 80
      });
      
      this.screenshots.push({
        page: pageName,
        path: screenshotPath,
        timestamp: new Date().toISOString()
      });
      
      return screenshotPath;
    } catch (error) {
      this.log(`⚠️  截圖失敗: ${error.message}`, 'warn');
      return null;
    }
  }

  async checkPageElements(pageConfig) {
    const missingElements = [];
    const foundElements = [];

    for (const selector of pageConfig.expectedElements || []) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          foundElements.push(selector);
        } else {
          missingElements.push(selector);
        }
      } catch (error) {
        missingElements.push(selector);
      }
    }

    return { foundElements, missingElements };
  }

  async performPageActions(pageConfig) {
    const actionResults = [];

    for (const action of pageConfig.actions || []) {
      try {
        let result = false;

        switch (action) {
          case 'login_test':
            // 測試登入表單驗證
            await this.page.fill('input[name="email"]', 'invalid-email');
            await this.page.click('button[type="submit"]');
            await this.page.waitForTimeout(1000);
            
            const errorMessage = await this.page.$('.error-message, .error, [role="alert"]');
            result = !!errorMessage;
            break;

          case 'form_test':
            // 測試表單填寫和提交
            const inputs = await this.page.$$('input[type="text"], input[type="email"], textarea');
            if (inputs.length > 0) {
              await inputs[0].fill('測試內容');
              result = true;
            }
            break;

          case 'table_test':
            // 測試表格功能
            const table = await this.page.$('table, .table, .data-grid');
            result = !!table;
            break;

          case 'crud_test':
            // 測試 CRUD 操作按鈕
            const addButton = await this.page.$('button:has-text("新增"), button:has-text("添加"), .add-button');
            result = !!addButton;
            break;

          case 'template_selection':
            // 測試範本選擇
            const templateCard = await this.page.$('.template-card, .template-item');
            result = !!templateCard;
            break;

          case 'editor_test':
            // 測試編輯器功能
            const editor = await this.page.$('.tiptap-editor, .editor, .ProseMirror');
            if (editor) {
              await editor.click();
              await this.page.keyboard.type('測試編輯器內容');
              result = true;
            }
            break;

          case 'ai_integration':
            // 測試 AI 功能按鈕
            const aiButton = await this.page.$('button:has-text("AI"), button:has-text("生成")');
            result = !!aiButton;
            break;

          case 'ai_test':
            // 測試 AI 功能表單
            const textarea = await this.page.$('textarea');
            if (textarea) {
              await textarea.fill('測試 AI 功能內容');
              result = true;
            }
            break;

          case 'data_visualization':
            // 測試數據可視化元素
            const charts = await this.page.$('.chart, .graph, canvas, svg');
            result = !!charts;
            break;

          case 'export_test':
            // 測試匯出功能
            const exportButtons = await this.page.$$('button:has-text("匯出"), .export-button');
            result = exportButtons.length > 0;
            break;

          case 'navigation_test':
            // 測試導航功能
            const navLinks = await this.page.$$('nav a, .nav-link, .sidebar a');
            result = navLinks.length > 0;
            break;

          default:
            this.log(`⚠️  未知的動作類型: ${action}`, 'warn');
        }

        actionResults.push({ action, success: result });

      } catch (error) {
        actionResults.push({ action, success: false, error: error.message });
      }

      // 在動作之間稍作暫停
      await this.page.waitForTimeout(500);
    }

    return actionResults;
  }

  async testPage(pageConfig) {
    const testStartTime = Date.now();
    let testResult = {
      name: pageConfig.name,
      path: pageConfig.path,
      category: pageConfig.category,
      success: false,
      loadTime: 0,
      elementsCheck: { foundElements: [], missingElements: [] },
      actionsResults: [],
      screenshot: null,
      errors: []
    };

    try {
      this.log(`測試頁面: ${pageConfig.name} (${pageConfig.path})`);

      // 導航到頁面
      const navigationStart = Date.now();
      await this.page.goto(`${this.baseURL}${pageConfig.path}`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      testResult.loadTime = Date.now() - navigationStart;

      // 等待頁面渲染
      await this.page.waitForTimeout(2000);

      // 檢查頁面元素
      testResult.elementsCheck = await this.checkPageElements(pageConfig);

      // 執行頁面動作
      if (pageConfig.actions) {
        testResult.actionsResults = await this.performPageActions(pageConfig);
      }

      // 拍攝截圖
      testResult.screenshot = await this.takeScreenshot(pageConfig.name);

      // 檢查 JavaScript 錯誤
      const jsErrors = await this.page.evaluate(() => {
        return window.jsErrors || [];
      });
      testResult.errors = jsErrors;

      // 判定測試成功
      const hasRequiredElements = testResult.elementsCheck.missingElements.length === 0;
      const actionsSuccessful = testResult.actionsResults.every(a => a.success);
      const noJSErrors = jsErrors.length === 0;
      const loadTimeOK = testResult.loadTime < 5000; // 5 秒載入時間限制

      testResult.success = hasRequiredElements && actionsSuccessful && noJSErrors && loadTimeOK;

      if (testResult.success) {
        this.log(`✅ ${pageConfig.name} 測試通過 (載入時間: ${testResult.loadTime}ms)`, 'success');
      } else {
        const issues = [];
        if (!hasRequiredElements) issues.push('缺少必要元素');
        if (!actionsSuccessful) issues.push('功能測試失敗');
        if (!noJSErrors) issues.push('JavaScript 錯誤');
        if (!loadTimeOK) issues.push('載入時間過長');
        
        this.log(`❌ ${pageConfig.name} 測試失敗: ${issues.join(', ')}`, 'error');
      }

    } catch (error) {
      testResult.errors.push(error.message);
      this.log(`❌ ${pageConfig.name} 測試異常: ${error.message}`, 'error');
    }

    testResult.totalTime = Date.now() - testStartTime;
    return testResult;
  }

  async checkResponsiveDesign() {
    this.log('檢查響應式設計...', 'test');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1366, height: 768 }
    ];

    const responsiveResults = [];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      await this.page.goto(`${this.baseURL}/dashboard`, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(1000);

      // 檢查水平滾動
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });

      // 檢查主要元素是否可見
      const mainElements = await this.page.$$eval('main, .main-content, .container', elements => {
        return elements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            visible: rect.width > 0 && rect.height > 0,
            width: rect.width,
            height: rect.height
          };
        });
      });

      responsiveResults.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        hasHorizontalScroll,
        mainElementsVisible: mainElements.every(el => el.visible),
        issues: hasHorizontalScroll ? ['horizontal scroll'] : []
      });

      const status = !hasHorizontalScroll && mainElements.every(el => el.visible) ? '✅' : '❌';
      this.log(`${status} ${viewport.name} (${viewport.width}x${viewport.height})`);
    }

    return responsiveResults;
  }

  async checkAccessibility() {
    this.log('檢查無障礙設計...', 'test');
    
    try {
      await this.page.goto(`${this.baseURL}/dashboard`, { waitUntil: 'networkidle0' });

      // 檢查 alt 屬性
      const imagesWithoutAlt = await this.page.$$eval('img:not([alt])', imgs => imgs.length);
      
      // 檢查表單標籤
      const inputsWithoutLabels = await this.page.$$eval('input:not([aria-label]):not([aria-labelledby])', inputs => {
        return inputs.filter(input => {
          const label = document.querySelector(`label[for="${input.id}"]`);
          return !label && input.type !== 'hidden';
        }).length;
      });

      // 檢查按鈕文字
      const buttonsWithoutText = await this.page.$$eval('button', buttons => {
        return buttons.filter(btn => !btn.textContent.trim() && !btn.getAttribute('aria-label')).length;
      });

      const accessibilityScore = 100 - (imagesWithoutAlt * 10) - (inputsWithoutLabels * 15) - (buttonsWithoutText * 10);

      return {
        score: Math.max(0, accessibilityScore),
        issues: {
          imagesWithoutAlt,
          inputsWithoutLabels,
          buttonsWithoutText
        }
      };

    } catch (error) {
      this.log(`⚠️  無障礙檢查失敗: ${error.message}`, 'warn');
      return { score: 0, error: error.message };
    }
  }

  async generateFrontendReport(testResults, responsiveResults, accessibilityResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: testResults.length,
        passedPages: testResults.filter(r => r.success).length,
        failedPages: testResults.filter(r => !r.success).length,
        averageLoadTime: Math.round(testResults.reduce((sum, r) => sum + r.loadTime, 0) / testResults.length),
        totalErrors: testResults.reduce((sum, r) => sum + r.errors.length, 0)
      },
      categories: {},
      pages: testResults,
      responsive: responsiveResults,
      accessibility: accessibilityResults,
      screenshots: this.screenshots,
      recommendations: []
    };

    // 分類統計
    testResults.forEach(result => {
      if (!report.categories[result.category]) {
        report.categories[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      report.categories[result.category].total++;
      if (result.success) {
        report.categories[result.category].passed++;
      } else {
        report.categories[result.category].failed++;
      }
    });

    // 生成建議
    if (report.summary.failedPages > 0) {
      const failedPages = testResults.filter(r => !r.success);
      report.recommendations.push({
        priority: 'high',
        message: `${report.summary.failedPages} 個頁面存在問題需要修復`,
        details: failedPages.map(p => `${p.name}: ${p.errors.join(', ')}`)
      });
    }

    if (report.summary.averageLoadTime > 3000) {
      report.recommendations.push({
        priority: 'medium',
        message: `平均載入時間過長 (${report.summary.averageLoadTime}ms)，建議優化`,
        details: '考慮代碼分割、圖片優化、快取策略等'
      });
    }

    if (accessibilityResults.score < 80) {
      report.recommendations.push({
        priority: 'medium',
        message: `無障礙設計評分偏低 (${accessibilityResults.score}/100)`,
        details: '添加適當的 alt 屬性、表單標籤和按鈕文字'
      });
    }

    const reportPath = path.join(process.cwd(), 'frontend-pages-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`\n📊 前端頁面測試完成結果:`);
    this.log(`🚀 總頁面數: ${report.summary.totalPages}`);
    this.log(`✅ 通過: ${report.summary.passedPages}`);
    this.log(`❌ 失敗: ${report.summary.failedPages}`);
    this.log(`⚡ 平均載入時間: ${report.summary.averageLoadTime}ms`);
    this.log(`🎯 成功率: ${((report.summary.passedPages / report.summary.totalPages) * 100).toFixed(1)}%`);
    this.log(`♿ 無障礙評分: ${accessibilityResults.score}/100`);
    this.log(`📱 響應式設計: ${responsiveResults.filter(r => r.issues.length === 0).length}/${responsiveResults.length} 通過`);
    this.log(`📋 詳細報告: ${reportPath}`);
    this.log(`📸 截圖目錄: ${path.join(process.cwd(), 'screenshots')}`);

    Object.entries(report.categories).forEach(([category, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      this.log(`  📁 ${category}: ${stats.passed}/${stats.total} (${successRate}%)`);
    });

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('🧹 瀏覽器已關閉');
    }
  }

  async runFullFrontendCheck() {
    try {
      this.log('🚀 開始前端頁面功能完整檢查...');
      
      await this.initBrowser();
      
      // 執行登入
      const loginSuccess = await this.performLogin();
      
      const testResults = [];
      
      // 測試每個頁面
      for (const pageConfig of this.pages) {
        if (pageConfig.requiresAuth && !loginSuccess) {
          this.log(`⏭️  跳過 ${pageConfig.name} (需要認證)`, 'warn');
          continue;
        }
        
        const result = await this.testPage(pageConfig);
        testResults.push(result);
        
        // 在頁面測試之間稍作暫停
        await this.page.waitForTimeout(1000);
      }

      // 檢查響應式設計
      const responsiveResults = loginSuccess ? await this.checkResponsiveDesign() : [];
      
      // 檢查無障礙設計
      const accessibilityResults = loginSuccess ? await this.checkAccessibility() : { score: 0, error: '無法進行檢查' };
      
      // 生成報告
      const report = await this.generateFrontendReport(testResults, responsiveResults, accessibilityResults);
      
      const successRate = (report.summary.passedPages / report.summary.totalPages) * 100;
      
      if (successRate >= 90) {
        this.log('🎉 前端頁面功能檢查優秀！', 'success');
        return 0;
      } else if (successRate >= 75) {
        this.log('⚡ 前端頁面功能基本正常，部分需要改進', 'warn');
        return 0;
      } else {
        this.log('🚨 前端頁面存在較多問題，需要修復', 'error');
        return 1;
      }
      
    } catch (error) {
      this.log(`❌ 前端頁面檢查執行失敗: ${error.message}`, 'error');
      return 1;
    } finally {
      await this.cleanup();
    }
  }
}

// 執行檢查
if (require.main === module) {
  const checker = new FrontendPagesChecker();
  
  // 優雅退出處理
  process.on('SIGINT', async () => {
    console.log('\n收到中斷信號，正在清理...');
    await checker.cleanup();
    process.exit(0);
  });

  checker.runFullFrontendCheck()
    .then(exitCode => process.exit(exitCode))
    .catch(async (error) => {
      console.error('前端頁面檢查執行失敗:', error);
      await checker.cleanup();
      process.exit(1);
    });
}

module.exports = FrontendPagesChecker;