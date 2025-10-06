import { test, expect } from '@playwright/test';

test.describe('認證流程 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    // 清除本地存儲和cookies以確保乾淨的測試環境
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // 重新載入頁面以確保清除生效
    await page.reload();
  });

  test('用戶註冊流程', async ({ page }) => {
    // 設置console監聽以查看錯誤
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));

    // 點擊註冊分頁
    await page.click('button:has-text("註冊")');

    // 等待註冊表單載入
    await page.waitForSelector('input[name="name"]');

    // 填寫註冊表單
    const timestamp = Date.now();
    // 生成唯一的統一編號 (8位數字)
    const uniqueTaxId = String(timestamp).slice(-8);

    await page.fill('input[name="name"]', '測試用戶');
    await page.fill('input[name="email"]', `test-${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123!@');
    await page.fill('input[name="company_name"]', '測試公司');
    await page.fill('input[name="tax_id"]', uniqueTaxId);
    await page.fill('input[name="address"]', '台北市測試路123號');
    await page.fill('input[name="phone"]', '02-1234-5678');
    await page.fill('input[name="company_email"]', `company-${timestamp}@example.com`);

    // 提交註冊
    const registerButton = page.locator('button:has-text("建立帳戶")');
    await registerButton.waitFor({ state: 'visible' });
    await registerButton.click();

    // 等待按鈕顯示 "註冊中..." 表示提交開始
    await page.waitForSelector('button:has-text("註冊中...")', { timeout: 5000 }).catch(() => {
      console.log('Button text may not have changed to 註冊中...');
    });

    // 等待導航到 dashboard (可能是 / 或 /dashboard)
    await page.waitForFunction(() => {
      const url = window.location.pathname;
      return url === '/' || url === '/dashboard';
    }, { timeout: 15000 });

    // 驗證 dashboard 頁面已載入
    await expect(page.locator('text=歡迎回來')).toBeVisible({ timeout: 5000 });
  });

  test('用戶登入流程', async ({ page }) => {
    // 先註冊一個測試用戶
    const timestamp = Date.now();
    const email = `test-login-${timestamp}@example.com`;
    const password = 'TestPassword123!@';
    // 生成唯一的統一編號 (8位數字)
    const uniqueTaxId = String(timestamp).slice(-8);

    await page.click('button:has-text("註冊")');
    await page.waitForSelector('input[name="name"]');

    await page.fill('input[name="name"]', '測試用戶');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="company_name"]', '測試登入公司');
    await page.fill('input[name="tax_id"]', uniqueTaxId);
    await page.fill('input[name="address"]', '台北市測試路456號');
    await page.fill('input[name="phone"]', '02-8765-4321');
    await page.fill('input[name="company_email"]', `company-login-${timestamp}@example.com`);

    const registerButton = page.locator('button:has-text("建立帳戶")');
    await registerButton.waitFor({ state: 'visible' });

    await registerButton.click();

    // 等待導航到 dashboard (可能是 / 或 /dashboard)
    await page.waitForFunction(() => {
      const url = window.location.pathname;
      return url === '/' || url === '/dashboard';
    }, { timeout: 15000 });

    // 驗證 dashboard 頁面已載入
    await expect(page.locator('text=歡迎回來')).toBeVisible({ timeout: 5000 });

    // 登出 - 點擊右上角的用戶頭像打開選單
    const userMenuButton = page.locator('button:has(svg[data-testid="AccountCircleIcon"])');
    await userMenuButton.click();

    // 點擊登出選項
    const logoutButton = page.locator('li:has-text("登出")');
    await logoutButton.click();

    // 等待回到登入頁面
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // 測試登入
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]:has-text("登入")');

    // 驗證登入成功並回到 dashboard
    await page.waitForFunction(() => {
      const url = window.location.pathname;
      return url === '/' || url === '/dashboard';
    }, { timeout: 15000 });
    await expect(page.locator('text=歡迎回來')).toBeVisible({ timeout: 5000 });
  });

  test('登入驗證錯誤處理', async ({ page }) => {
    // 測試錯誤的登入資訊
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // 等待 API 請求並提交
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/auth/login') && response.status() === 401,
      { timeout: 10000 }
    );

    await page.click('button[type="submit"]');

    // 等待登入失敗的 401 響應
    await responsePromise;

    // 驗證仍然在登入頁面 (沒有導航到 dashboard)
    await page.waitForTimeout(1000); // 等待可能的導航嘗試
    await expect(page.locator('button[type="submit"]:has-text("登入")')).toBeVisible();

    // 驗證頁面 URL 沒有改變
    expect(page.url()).toContain('/');
  });
});