# FR-025 用戶引導系統 - 測試指南

## 快速測試步驟

### 1. 準備測試環境

```bash
# 啟動後端服務
cd backend
npm run dev

# 啟動前端服務（新終端）
cd frontend
npm run dev
```

### 2. 重置引導狀態（瀏覽器 Console）

```javascript
// 開啟瀏覽器開發者工具 (F12)，在 Console 執行：
localStorage.removeItem('onboarding_completed')
localStorage.removeItem('onboarding_seen')
localStorage.removeItem('onboarding_in_progress')

// 重新整理頁面
location.reload()
```

### 3. 測試場景

#### 場景 1: 首次用戶體驗（0% 完整度）

**操作流程**：
1. 註冊新帳號或登入現有帳號
2. 確保資料庫中無任何資料
3. 導航到 Dashboard

**預期結果**：
- ✅ 自動彈出引導 Modal
- ✅ 顯示「整體完成度 0%」
- ✅ 4 個步驟卡片全部顯示為未完成
- ✅ 公司、團隊、實績顯示「立即設定」按鈕（藍色）
- ✅ 獎項顯示「選擇設定」按鈕（灰色，標示選填）

#### 場景 2: 部分完成（50% 完整度）

**操作流程**：
1. 點擊「立即設定」→ 公司基本資料
2. 填寫所有必填欄位並儲存
3. 返回 Dashboard
4. 點擊「立即設定」→ 團隊成員
5. 新增 1 位團隊成員
6. 返回 Dashboard

**預期結果**：
- ✅ 引導 Modal 顯示「整體完成度 50%」
- ✅ 公司和團隊步驟顯示為已完成（綠色勾勾）
- ✅ 專案和獎項仍為未完成
- ✅ Dashboard 顯示資料完整度進度條 50%（橘色）

#### 場景 3: 達到基本要求（75% 完整度）

**操作流程**：
1. 點擊「立即設定」→ 專案實績
2. 新增 1 個專案
3. 返回 Dashboard

**預期結果**：
- ✅ 引導 Modal 顯示「整體完成度 75%」
- ✅ 前 3 個步驟顯示為已完成
- ✅ 獎項仍為未完成（選填）
- ✅ Dashboard 進度條變為綠色
- ✅ 顯示「已達到基本要求，可以開始建立標書」
- ✅ 引導 Modal 出現「完成引導」按鈕

#### 場景 4: 完整設定（100% 完整度）

**操作流程**：
1. 點擊「選擇設定」→ 獲獎紀錄
2. 新增 1 筆獲獎記錄
3. 返回 Dashboard

**預期結果**：
- ✅ 引導 Modal 顯示「整體完成度 100%」
- ✅ 所有 4 個步驟顯示為已完成
- ✅ Dashboard 不再顯示完整度卡片（已 100%）
- ✅ 點擊「完成引導」後 Modal 關閉

#### 場景 5: 跳過引導

**操作流程**：
1. 清除 localStorage（見步驟 2）
2. 重新整理頁面，引導 Modal 出現
3. 點擊「稍後設定」按鈕

**預期結果**：
- ✅ Modal 立即關閉
- ✅ 重新整理頁面，Modal 不再出現
- ✅ Dashboard 仍顯示完整度進度卡片
- ✅ 可以點擊待完成項目進行設定

#### 場景 6: 驗收標準測試（Acceptance Scenario #5）

**操作流程**：
1. 清除 localStorage 和所有資料
2. 登入系統
3. 完成公司資料（25%）
4. 新增 1 位團隊成員（50%）
5. 新增 1 個專案實績（75%）
6. **跳過**獲獎紀錄

**預期結果**：
- ✅ Dashboard 顯示資料完整度 75%
- ✅ 3/4 必填項目完成
- ✅ 待完成項目顯示「獲獎紀錄」提示卡片
- ✅ 可以正常使用「建立新標書」功能
- ✅ 顯示「已達到基本要求」訊息

## 自動化測試檢查清單

### Unit Tests

```typescript
// useDataCompleteness Hook
✅ 計算公司資料完整度百分比
✅ 檢測團隊成員數量
✅ 檢測專案實績數量
✅ 檢測獲獎記錄數量
✅ 計算總完整度百分比
✅ 產生待完成項目清單

// OnboardingGuide Component
✅ 根據完整度顯示/隱藏
✅ localStorage 狀態管理
✅ 步驟卡片渲染
✅ 導航功能
✅ 完成/跳過功能
```

### Integration Tests

```typescript
✅ Dashboard 載入時觸發完整度檢測
✅ API 並行請求正確處理
✅ 錯誤處理不影響 Dashboard 載入
✅ 完成設定後資料即時更新
```

### E2E Tests (Playwright)

```typescript
test('首次用戶引導流程', async ({ page }) => {
  // 1. 清除 localStorage
  await page.evaluate(() => {
    localStorage.clear()
  })

  // 2. 登入
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // 3. 驗證引導 Modal
  await expect(page.locator('text=歡迎使用智能標案產生器')).toBeVisible()
  await expect(page.locator('text=整體完成度')).toBeVisible()

  // 4. 完成公司資料
  await page.click('text=立即設定 >> nth=0')
  // ... 填寫表單
  await page.click('text=儲存')

  // 5. 驗證進度更新
  await page.goto('/dashboard')
  await expect(page.locator('text=25%')).toBeVisible()
})
```

## 效能測試

### 載入時間測試

```javascript
// 在瀏覽器 Console 執行
performance.mark('dashboard-start')

// 等待頁面完全載入

performance.mark('dashboard-end')
performance.measure('dashboard-load', 'dashboard-start', 'dashboard-end')
console.log(performance.getEntriesByName('dashboard-load')[0].duration)

// 預期: < 2000ms (2秒)
```

### API 請求測試

打開 Network Tab，檢查：
- ✅ 4 個 API 請求並行執行（公司、團隊、專案、獎項）
- ✅ 請求時間 < 500ms
- ✅ 錯誤處理不阻塞其他請求

## 常見問題排查

### Q1: 引導 Modal 不顯示

**檢查項目**：
```javascript
// Console 執行
console.log('Onboarding completed:', localStorage.getItem('onboarding_completed'))
console.log('Onboarding seen:', localStorage.getItem('onboarding_seen'))
console.log('Completeness:', /* 從 DevTools React 檢查 */)
```

**解決方案**：
- 清除 localStorage
- 確保資料完整度 < 80%

### Q2: 完整度計算錯誤

**檢查項目**：
```javascript
// 檢查 API 回應
// Network Tab → 檢查 /companies, /team-members, /projects, /awards
```

**解決方案**：
- 確認資料庫有正確資料
- 檢查 API 回應格式
- 查看 Console 錯誤訊息

### Q3: 樣式顯示異常

**檢查項目**：
- Tailwind CSS 是否正確載入
- shadcn/ui 組件是否正確安裝

**解決方案**：
```bash
# 重新建構
cd frontend
npm run build
npm run dev
```

## 瀏覽器相容性

測試的瀏覽器版本：
- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

## 回歸測試清單

在部署前確認：
- ✅ 現有 Dashboard 功能不受影響
- ✅ 登入/登出流程正常
- ✅ 資料 CRUD 功能正常
- ✅ 標書建立流程不受影響
- ✅ 無 Console 錯誤
- ✅ 無 TypeScript 編譯錯誤
- ✅ Lint 檢查通過

## 測試資料準備

### 測試帳號

```json
{
  "email": "test-onboarding@example.com",
  "password": "Test123!@#",
  "name": "測試用戶"
}
```

### 資料完整度測試資料

**0% 完整度**：
- 無公司資料
- 無團隊成員
- 無專案實績
- 無獲獎記錄

**25% 完整度**：
- ✅ 完整公司資料
- ❌ 無團隊成員
- ❌ 無專案實績
- ❌ 無獲獎記錄

**50% 完整度**：
- ✅ 完整公司資料
- ✅ 1 位團隊成員
- ❌ 無專案實績
- ❌ 無獲獎記錄

**75% 完整度**：
- ✅ 完整公司資料
- ✅ 1 位團隊成員
- ✅ 1 個專案實績
- ❌ 無獲獎記錄

**100% 完整度**：
- ✅ 完整公司資料
- ✅ 1 位團隊成員
- ✅ 1 個專案實績
- ✅ 1 筆獲獎記錄

## 驗收通過標準

所有以下項目必須通過：

1. ✅ 功能完整性
   - 所有測試場景通過
   - 驗收標準符合

2. ✅ 程式碼品質
   - TypeScript 無錯誤
   - Lint 檢查通過
   - 測試覆蓋率 > 80%

3. ✅ 效能指標
   - Dashboard 載入 < 2s
   - API 請求 < 500ms
   - 無記憶體洩漏

4. ✅ 用戶體驗
   - 引導流程順暢
   - 視覺回饋明確
   - 錯誤處理友善

5. ✅ 相容性
   - 主流瀏覽器支援
   - 響應式設計
   - 無障礙支援
