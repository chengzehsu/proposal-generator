import { test, expect } from '@playwright/test';

test.describe('完整標案生成工作流程 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    // 登入測試用戶
    await page.goto('/');
    const timestamp = Date.now();
    const email = `workflow-test-${timestamp}@example.com`;
    const uniqueTaxId = String(Date.now()).slice(-8);

    // 註冊測試用戶
    await page.click('button:has-text("註冊")');
    await page.fill('input[name="name"]', '測試用戶');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="company_name"]', '智能科技股份有限公司');
    await page.fill('input[name="tax_id"]', uniqueTaxId);
    await page.fill('input[name="address"]', '台北市信義區');
    await page.fill('input[name="phone"]', '02-1234-5678');
    await page.fill('input[name="company_email"]', `company-${timestamp}@example.com`);
    const registerButton = page.locator('button:has-text("建立帳戶")');
    await registerButton.click();

    // 等待導航到 dashboard (可能是 / 或 /dashboard)
    await page.waitForFunction(() => {
      const url = window.location.pathname;
      return url === '/' || url === '/dashboard';
    }, { timeout: 15000 });
  });

  test.skip('完整標案生成流程', async ({ page }) => {
    // TODO: AI功能、範本管理、標案編輯器等頁面尚未實作
    const uniqueTaxId = String(Date.now()).slice(-8);

    // Step 1: 設定公司基本資料
    await page.click('button:has-text("公司資料管理")');
    await expect(page).toHaveURL('/database/company');

    await page.fill('input[name="name"]', '智能科技股份有限公司');
    await page.fill('input[name="taxId"]', uniqueTaxId);
    await page.fill('input[name="address"]', '台北市信義區信義路五段7號');
    await page.fill('input[name="phone"]', '02-1234-5678');
    await page.fill('input[name="email"]', 'info@smarttech.com.tw');
    await page.fill('input[name="website"]', 'https://smarttech.com.tw');
    await page.fill('textarea[name="description"]', '專業的AI解決方案提供商，致力於智慧城市建設');

    await page.click('button:has-text("儲存")');
    await expect(page.locator('text=資料已成功更新')).toBeVisible();

    // Step 2: 新增團隊成員
    await page.click('button:has-text("團隊成員")');
    await expect(page).toHaveURL('/database/team');
    
    await page.click('button:has-text("新增成員")');
    await page.fill('input[name="name"]', '張技術經理');
    await page.fill('input[name="position"]', '技術總監');
    await page.fill('input[name="department"]', 'AI研發部');
    await page.fill('input[name="email"]', 'zhang@smarttech.com.tw');
    await page.fill('input[name="phone"]', '02-1234-5679');
    
    await page.click('button:has-text("儲存")');
    await expect(page.locator('text=成員已成功新增')).toBeVisible();

    // Step 3: 新增專案實績
    await page.click('button:has-text("專案實績")');
    await expect(page).toHaveURL('/database/projects');
    
    await page.click('button:has-text("新增專案")');
    await page.fill('input[name="name"]', '智慧交通管理系統');
    await page.fill('input[name="client"]', '台北市政府');
    await page.fill('input[name="startDate"]', '2023-01-01');
    await page.fill('input[name="endDate"]', '2023-12-31');
    await page.fill('input[name="budget"]', '5000000');
    await page.fill('textarea[name="description"]', '建置智慧交通號誌控制系統，提升道路使用效率');
    
    await page.click('button:has-text("儲存")');
    await expect(page.locator('text=專案已成功新增')).toBeVisible();

    // Step 4: 選擇標案範本
    await page.click('button:has-text("範本管理")');
    await expect(page).toHaveURL('/templates');
    
    // 等待範本載入
    await page.waitForSelector('.template-card', { timeout: 10000 });
    await page.click('.template-card:first-child button:has-text("使用此範本")');

    // Step 5: 開始標案編輯
    await expect(page).toHaveURL(/\/editor\/*/);
    await expect(page.locator('text=標案編輯器')).toBeVisible();
    
    // 填寫標案基本資訊
    await page.fill('input[name="title"]', '新北市智慧路燈管理系統建置案');
    await page.fill('input[name="client"]', '新北市政府');
    await page.fill('input[name="dueDate"]', '2024-06-30');

    // Step 6: 使用 AI 生成內容
    await page.click('button:has-text("AI 生成")');
    await page.fill('textarea[name="prompt"]', '請撰寫智慧路燈系統的技術規格說明');
    await page.click('button:has-text("生成內容")');
    
    // 等待 AI 生成完成
    await expect(page.locator('.ai-generated-content')).toBeVisible({ timeout: 30000 });

    // Step 7: 編輯和完善內容
    await page.click('.editor-content');
    await page.fill('.editor-content', '這是經過人工調整的內容...');

    // Step 8: 儲存草稿
    await page.click('button:has-text("儲存草稿")');
    await expect(page.locator('text=草稿已儲存')).toBeVisible();

    // Step 9: 文件匯出
    await page.click('button:has-text("匯出文件")');
    await page.click('button:has-text("匯出 PDF")');
    
    // 等待匯出完成
    await expect(page.locator('text=文件匯出完成')).toBeVisible({ timeout: 30000 });

    // Step 10: 驗證完整流程
    await page.click('button:has-text("儀表板")');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=新北市智慧路燈管理系統建置案')).toBeVisible();
  });

  test.skip('AI 功能測試', async ({ page }) => {
    // TODO: AI功能頁面尚未實作
    // 測試 AI 內容改善功能
    await page.goto('/ai/improve');
    
    await page.fill('textarea[name="content"]', '我們公司有很好的技術能力');
    await page.click('button:has-text("改善內容")');
    
    await expect(page.locator('.improved-content')).toBeVisible({ timeout: 30000 });
    
    // 測試 AI 翻譯功能
    await page.goto('/ai/translate');
    
    await page.fill('textarea[name="content"]', '本公司具備先進的人工智慧技術');
    await page.selectOption('select[name="targetLanguage"]', 'en');
    await page.click('button:has-text("翻譯")');
    
    await expect(page.locator('.translated-content')).toBeVisible({ timeout: 30000 });

    // 測試需求提取功能
    await page.goto('/ai/extract-requirements');
    
    await page.fill('textarea[name="content"]', '需要建置一套智慧城市管理系統，包含交通監控、環境感測、緊急應變等功能');
    await page.click('button:has-text("提取需求")');
    
    await expect(page.locator('.extracted-requirements')).toBeVisible({ timeout: 30000 });
  });

  test.skip('文件匯出功能測試', async ({ page }) => {
    // TODO: 文件匯出功能尚未實作
    // 建立一個簡單的標案
    await page.goto('/editor');
    
    await page.fill('input[name="title"]', '測試標案文件');
    await page.fill('input[name="client"]', '測試客戶');
    
    // 新增一些內容
    await page.click('.editor-content');
    await page.fill('.editor-content', '這是測試標案的內容...');
    
    await page.click('button:has-text("儲存草稿")');
    await expect(page.locator('text=草稿已儲存')).toBeVisible();

    // 測試不同格式匯出
    const exportFormats = ['PDF', 'Word', 'ODT'];
    
    for (const format of exportFormats) {
      await page.click('button:has-text("匯出文件")');
      await page.click(`button:has-text("匯出 ${format}")`);
      
      await expect(page.locator(`text=${format} 匯出完成`)).toBeVisible({ timeout: 30000 });
    }
  });

  test.skip('響應式設計測試', async ({ page }) => {
    // TODO: 需要在主要功能完成後測試響應式設計
    // 測試手機版本
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // 測試手機選單
    await page.click('button[aria-label="開啟選單"]');
    await expect(page.locator('.mobile-menu')).toBeVisible();
    
    // 測試各頁面在手機上的顯示
    const mobilePages = ['/database/company', '/database/team', '/templates', '/editor'];
    
    for (const pageUrl of mobilePages) {
      await page.goto(pageUrl);
      await expect(page.locator('main')).toBeVisible();
      
      // 確保沒有水平滾動
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 允許5px誤差
    }
  });
});