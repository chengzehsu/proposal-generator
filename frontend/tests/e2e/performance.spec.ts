import { test, expect } from '@playwright/test';

test.describe('效能測試', () => {
  let testUserEmail: string;

  test.beforeEach(async ({ page }) => {
    const timestamp = Date.now();
    testUserEmail = `perf-test-${timestamp}@example.com`;
    const uniqueTaxId = String(timestamp).slice(-8);

    // 快速註冊登入
    await page.goto('/');
    await page.click('button:has-text("註冊")');
    await page.waitForSelector('input[name="name"]');

    await page.fill('input[name="name"]', '效能測試用戶');
    await page.fill('input[name="email"]', testUserEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="company_name"]', '效能測試公司');
    await page.fill('input[name="tax_id"]', uniqueTaxId);
    await page.fill('input[name="address"]', '台北市信義區');
    await page.fill('input[name="phone"]', '02-12345678');
    await page.fill('input[name="company_email"]', testUserEmail);

    const registerButton = page.locator('button:has-text("建立帳戶")');
    await registerButton.click();

    // 等待導航到 dashboard
    await page.waitForFunction(() => {
      const url = window.location.pathname;
      return url === '/' || url === '/dashboard';
    }, { timeout: 15000 });
  });

  test('頁面載入效能測試', async ({ page }) => {
    const performanceData = [];

    const pages = [
      { url: '/dashboard', name: '儀表板' },
      { url: '/database/company', name: '公司資料' },
      { url: '/database/team', name: '團隊成員' },
      { url: '/database/projects', name: '專案實績' },
      { url: '/templates', name: '範本管理' },
      { url: '/editor', name: '標案編輯器' },
      { url: '/ai/generate', name: 'AI 生成' },
      { url: '/ai/improve', name: 'AI 改善' },
      { url: '/export', name: '文件匯出' }
    ];

    for (const pageInfo of pages) {
      const startTime = Date.now();
      
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      performanceData.push({
        page: pageInfo.name,
        url: pageInfo.url,
        loadTime
      });

      // 驗證載入時間不超過 3 秒 (3000ms)
      expect(loadTime).toBeLessThan(3000);
      console.log(`${pageInfo.name} 載入時間: ${loadTime}ms`);
    }

    // 檢查平均載入時間
    const avgLoadTime = performanceData.reduce((sum, data) => sum + data.loadTime, 0) / performanceData.length;
    expect(avgLoadTime).toBeLessThan(2500); // 平均載入時間應小於 2.5 秒
    console.log(`平均頁面載入時間: ${avgLoadTime.toFixed(2)}ms`);
  });

  test('API 響應時間測試', async ({ page }) => {
    const apiEndpoints = [
      { method: 'GET', url: '/api/v1/companies', name: '獲取公司資料' },
      { method: 'GET', url: '/api/v1/team-members', name: '獲取團隊成員' },
      { method: 'GET', url: '/api/v1/projects', name: '獲取專案實績' },
      { method: 'GET', url: '/api/v1/templates', name: '獲取範本列表' },
      { method: 'GET', url: '/api/v1/proposals', name: '獲取標案列表' }
    ];

    for (const endpoint of apiEndpoints) {
      const startTime = Date.now();
      
      const response = await page.request.get(`http://localhost:3002${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // API 響應時間應小於 2 秒
      expect(responseTime).toBeLessThan(2000);
      expect(response.status()).toBeLessThan(400);
      
      console.log(`${endpoint.name} API 響應時間: ${responseTime}ms`);
    }
  });

  test('大量數據處理效能', async ({ page }) => {
    await page.goto('/database/projects');

    // 批次新增多個專案
    const startTime = Date.now();
    
    for (let i = 1; i <= 50; i++) {
      await page.click('button:has-text("新增專案")');
      
      await page.fill('input[name="name"]', `效能測試專案 ${i}`);
      await page.fill('input[name="client"]', `測試客戶 ${i}`);
      await page.fill('input[name="startDate"]', '2023-01-01');
      await page.fill('input[name="endDate"]', '2023-12-31');
      await page.fill('input[name="budget"]', `${i * 100000}`);
      await page.fill('textarea[name="description"]', `這是第 ${i} 個效能測試專案，用於驗證系統在處理大量數據時的效能表現。`);
      
      await page.click('button:has-text("儲存")');
      await expect(page.locator('text=專案已成功新增')).toBeVisible({ timeout: 5000 });
      
      // 關閉成功訊息
      await page.click('[data-testid="close-notification"]');
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 50 個專案的新增時間應該在合理範圍內
    expect(totalTime).toBeLessThan(120000); // 2 分鐘內完成
    console.log(`批次新增 50 個專案耗時: ${totalTime}ms`);

    // 測試列表載入效能
    await page.reload();
    const listLoadStart = Date.now();
    await page.waitForSelector('.project-list');
    const listLoadTime = Date.now() - listLoadStart;
    
    expect(listLoadTime).toBeLessThan(3000); // 列表載入應在 3 秒內
    console.log(`專案列表載入時間: ${listLoadTime}ms`);

    // 測試搜尋效能
    const searchStart = Date.now();
    await page.fill('input[name="search"]', '效能測試專案 25');
    await page.waitForSelector('text=效能測試專案 25');
    const searchTime = Date.now() - searchStart;
    
    expect(searchTime).toBeLessThan(1000); // 搜尋應在 1 秒內完成
    console.log(`搜尋功能響應時間: ${searchTime}ms`);
  });

  test('TipTap 編輯器效能測試', async ({ page }) => {
    await page.goto('/editor');
    
    await page.fill('input[name="title"]', '效能測試標案');
    await page.fill('input[name="client"]', '測試客戶');

    // 測試大量文字輸入效能
    const largeText = '這是效能測試內容。'.repeat(1000); // 約 10,000 字
    
    const inputStart = Date.now();
    await page.click('.editor-content');
    await page.fill('.editor-content', largeText);
    const inputTime = Date.now() - inputStart;
    
    expect(inputTime).toBeLessThan(5000); // 大量文字輸入應在 5 秒內完成
    console.log(`編輯器大量文字輸入時間: ${inputTime}ms`);

    // 測試格式化操作效能
    const formatStart = Date.now();
    
    // 選取全部文字
    await page.keyboard.press('Control+A');
    
    // 執行多個格式化操作
    await page.click('button[data-testid="bold-button"]');
    await page.click('button[data-testid="italic-button"]');
    await page.click('button[data-testid="underline-button"]');
    
    const formatTime = Date.now() - formatStart;
    expect(formatTime).toBeLessThan(2000); // 格式化操作應在 2 秒內完成
    console.log(`編輯器格式化操作時間: ${formatTime}ms`);

    // 測試儲存效能
    const saveStart = Date.now();
    await page.click('button:has-text("儲存草稿")');
    await expect(page.locator('text=草稿已儲存')).toBeVisible();
    const saveTime = Date.now() - saveStart;
    
    expect(saveTime).toBeLessThan(3000); // 儲存應在 3 秒內完成
    console.log(`編輯器儲存時間: ${saveTime}ms`);
  });

  test('AI 功能效能測試', async ({ page }) => {
    const aiTests = [
      {
        url: '/ai/generate',
        action: async () => {
          await page.fill('textarea[name="prompt"]', '請生成一段關於智慧城市建設的技術方案說明，約500字');
          await page.click('button:has-text("生成內容")');
        },
        name: 'AI 內容生成'
      },
      {
        url: '/ai/improve',
        action: async () => {
          await page.fill('textarea[name="content"]', '我們公司有很好的技術能力，可以做AI項目');
          await page.selectOption('select[name="improvementType"]', '專業度提升');
          await page.click('button:has-text("改善內容")');
        },
        name: 'AI 內容改善'
      },
      {
        url: '/ai/translate',
        action: async () => {
          await page.fill('textarea[name="content"]', '本公司具備先進的人工智慧技術，專精於機器學習和深度學習領域');
          await page.selectOption('select[name="targetLanguage"]', '英文');
          await page.click('button:has-text("翻譯")');
        },
        name: 'AI 翻譯'
      }
    ];

    for (const aiTest of aiTests) {
      await page.goto(aiTest.url);
      
      const startTime = Date.now();
      await aiTest.action();
      
      // 等待 AI 處理完成
      await expect(page.locator('.ai-result')).toBeVisible({ timeout: 30000 });
      
      const endTime = Date.now();
      const processTime = endTime - startTime;
      
      // AI 功能應在 20 秒內完成
      expect(processTime).toBeLessThan(20000);
      console.log(`${aiTest.name}處理時間: ${processTime}ms`);
    }
  });

  test('文件匯出效能測試', async ({ page }) => {
    // 先創建一個標案文件
    await page.goto('/editor');
    await page.fill('input[name="title"]', '效能測試標案文件');
    await page.fill('input[name="client"]', '測試客戶');
    
    const content = '這是效能測試內容。'.repeat(100); // 中等長度文件
    await page.click('.editor-content');
    await page.fill('.editor-content', content);
    
    await page.click('button:has-text("儲存草稿")');
    await expect(page.locator('text=草稿已儲存')).toBeVisible();

    // 測試不同格式的匯出效能
    const exportFormats = ['PDF', 'DOCX', 'ODT'];
    
    for (const format of exportFormats) {
      const exportStart = Date.now();
      
      await page.click('button:has-text("匯出文件")');
      await page.click(`button:has-text("匯出 ${format}")`);
      
      await expect(page.locator(`text=${format} 匯出完成`)).toBeVisible({ timeout: 30000 });
      
      const exportTime = Date.now() - exportStart;
      
      // 文件匯出應在 20 秒內完成
      expect(exportTime).toBeLessThan(20000);
      console.log(`${format} 格式匯出時間: ${exportTime}ms`);
    }
  });

  test('併發用戶模擬測試', async ({ context }) => {
    // 創建多個併發用戶
    const users = [];
    const concurrentUsers = 5;
    
    for (let i = 0; i < concurrentUsers; i++) {
      const userPage = await context.newPage();
      const userEmail = `concurrent-${Date.now()}-${i}@example.com`;
      
      // 並行註冊用戶
      await userPage.goto('/');
      await userPage.click('text=註冊');
      await userPage.fill('input[name="email"]', userEmail);
      await userPage.fill('input[name="password"]', 'TestPassword123!');
      await userPage.fill('input[name="confirmPassword"]', 'TestPassword123!');
      await userPage.fill('input[name="companyName"]', `併發測試公司 ${i}`);
      
      users.push({
        page: userPage,
        email: userEmail,
        index: i
      });
    }

    // 同時註冊所有用戶
    const registrationStart = Date.now();
    await Promise.all(users.map(user => user.page.click('button[type="submit"]')));
    
    // 等待所有用戶註冊完成
    await Promise.all(users.map(user => 
      expect(user.page).toHaveURL('/dashboard')
    ));
    
    const registrationTime = Date.now() - registrationStart;
    expect(registrationTime).toBeLessThan(10000); // 併發註冊應在 10 秒內完成
    console.log(`${concurrentUsers} 個併發用戶註冊時間: ${registrationTime}ms`);

    // 測試併發操作
    const operationStart = Date.now();
    
    await Promise.all(users.map(async (user) => {
      await user.page.click('text=公司資料管理');
      await user.page.fill('input[name="name"]', `併發測試公司 ${user.index} - 已修改`);
      await user.page.click('button:has-text("儲存")');
      await expect(user.page.locator('text=資料已成功更新')).toBeVisible();
    }));
    
    const operationTime = Date.now() - operationStart;
    expect(operationTime).toBeLessThan(15000); // 併發操作應在 15 秒內完成
    console.log(`併發資料更新操作時間: ${operationTime}ms`);

    // 清理
    await Promise.all(users.map(user => user.page.close()));
  });

  test('記憶體使用效能測試', async ({ page }) => {
    await page.goto('/dashboard');

    // 監控初始記憶體使用
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory) {
      console.log(`初始記憶體使用: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
    }

    // 執行記憶體密集的操作
    const pages = ['/database/company', '/database/team', '/database/projects', '/templates', '/editor'];
    
    for (let round = 0; round < 3; round++) {
      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        await page.waitForLoadState('networkidle');
        
        // 執行一些互動操作
        if (pageUrl === '/editor') {
          await page.fill('input[name="title"]', `記憶體測試 ${round}`);
          await page.click('.editor-content');
          await page.fill('.editor-content', '測試內容...'.repeat(50));
        }
      }
    }

    // 檢查最終記憶體使用
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const memoryIncreasePercentage = (memoryIncrease / initialMemory.used) * 100;
      
      console.log(`最終記憶體使用: ${(finalMemory.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`記憶體增加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercentage.toFixed(1)}%)`);
      
      // 記憶體增長不應超過初始使用量的 200%
      expect(memoryIncreasePercentage).toBeLessThan(200);
    }
  });

  test('資料庫查詢效能測試', async ({ page }) => {
    // 創建大量測試資料
    await page.goto('/database/projects');
    
    // 測試分頁查詢效能
    const paginationStart = Date.now();
    
    await page.selectOption('select[name="pageSize"]', '100');
    await page.waitForSelector('.project-list');
    
    const paginationTime = Date.now() - paginationStart;
    expect(paginationTime).toBeLessThan(3000);
    console.log(`大批量資料分頁查詢時間: ${paginationTime}ms`);

    // 測試複雜篩選效能
    const filterStart = Date.now();
    
    await page.fill('input[name="search"]', '測試');
    await page.selectOption('select[name="category"]', '智慧城市');
    await page.fill('input[name="budgetMin"]', '1000000');
    await page.fill('input[name="budgetMax"]', '5000000');
    await page.click('button:has-text("套用篩選")');
    
    await page.waitForSelector('.filtered-results');
    
    const filterTime = Date.now() - filterStart;
    expect(filterTime).toBeLessThan(2000);
    console.log(`複雜篩選查詢時間: ${filterTime}ms`);

    // 測試排序效能
    const sortStart = Date.now();
    
    await page.click('th:has-text("預算")'); // 按預算排序
    await page.waitForSelector('[data-testid="sorted-indicator"]');
    
    const sortTime = Date.now() - sortStart;
    expect(sortTime).toBeLessThan(1000);
    console.log(`資料排序時間: ${sortTime}ms`);
  });
});