import { test, expect } from '@playwright/test';

test.describe('認證流程 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('用戶註冊流程', async ({ page }) => {
    // 點擊註冊按鈕
    await page.click('text=註冊');
    
    // 填寫註冊表單
    const timestamp = Date.now();
    await page.fill('input[name="email"]', `test-${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.fill('input[name="companyName"]', '測試公司');
    
    // 提交註冊
    await page.click('button[type="submit"]');
    
    // 驗證註冊成功
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=歡迎使用智能標案產生器')).toBeVisible();
  });

  test('用戶登入流程', async ({ page }) => {
    // 先註冊一個測試用戶
    const timestamp = Date.now();
    const email = `test-login-${timestamp}@example.com`;
    const password = 'TestPassword123!';
    
    await page.click('text=註冊');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.fill('input[name="companyName"]', '測試公司');
    await page.click('button[type="submit"]');
    
    // 登出
    await page.click('button[aria-label="用戶選單"]');
    await page.click('text=登出');
    
    // 測試登入
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // 驗證登入成功
    await expect(page).toHaveURL('/dashboard');
  });

  test('登入驗證錯誤處理', async ({ page }) => {
    // 測試錯誤的登入資訊
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // 驗證錯誤訊息顯示
    await expect(page.locator('text=登入失敗')).toBeVisible();
  });
});