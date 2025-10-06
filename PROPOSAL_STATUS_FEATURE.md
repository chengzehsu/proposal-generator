# 標案狀態管理功能 - 實作說明

**完成日期**: 2025-10-05
**功能編號**: FR-026
**實作人員**: 前端開發專員

## 功能概述

已成功整合標案狀態管理功能至前端介面，包含狀態篩選、更新、歷史記錄等完整功能。

## 已完成項目

### 1. 型別定義更新

**檔案**: `/shared/src/types/proposal.ts`

新增狀態相關型別：
- `ProposalStatus` enum (更新為新狀態系統)
- `ProposalStatusUpdateRequest` 介面
- `ProposalStatusHistory` 介面
- `ProposalStatusHistoryResponse` 介面

**狀態定義**:
```typescript
enum ProposalStatus {
  DRAFT = 'draft',        // 草稿
  PENDING = 'pending',    // 待提交
  SUBMITTED = 'submitted', // 已提交
  WON = 'won',            // 得標
  LOST = 'lost',          // 未得標
  CANCELLED = 'cancelled' // 取消
}
```

### 2. 狀態管理工具函數

**檔案**: `/frontend/src/utils/proposalStatus.ts`

提供以下工具函數：
- `getValidStatusTransitions(status)` - 取得合法狀態轉換
- `isValidStatusTransition(from, to)` - 驗證狀態轉換是否合法
- `getStatusLabel(status)` - 取得中文標籤
- `getStatusColor(status)` - 取得顏色主題
- `isFinalStatus(status)` - 檢查是否為最終狀態

**狀態轉換規則**:
```
DRAFT → PENDING, CANCELLED
PENDING → SUBMITTED, DRAFT, CANCELLED
SUBMITTED → WON, LOST, CANCELLED
WON → CANCELLED
LOST → CANCELLED
CANCELLED → (無法再轉換)
```

### 3. API 服務更新

**檔案**: `/frontend/src/services/api.ts`

新增 API 方法：
```typescript
// 更新標案狀態
updateProposalStatus(id, { status, note })

// 取得狀態歷史
getProposalStatusHistory(id)
```

### 4. UI 組件實作

#### 4.1 狀態更新對話框

**檔案**: `/frontend/src/components/proposals/UpdateStatusDialog.tsx`

功能：
- 顯示當前狀態
- 狀態選擇下拉選單（僅顯示合法轉換選項）
- 備註輸入欄位（選填，500字元限制）
- 驗證與錯誤處理
- 樂觀更新 UI

#### 4.2 狀態歷史時間軸

**檔案**: `/frontend/src/components/proposals/StatusHistoryTimeline.tsx`

功能：
- 垂直時間軸顯示
- 顯示狀態變更：from → to
- 顯示時間、操作人、備註
- 最新記錄標記（彩色圓點）
- 空狀態提示

### 5. 頁面整合

#### 5.1 標案列表頁面

**檔案**: `/frontend/src/pages/proposals/ProposalsListPage.tsx`

新增功能：
- 狀態篩選下拉選單（全部/草稿/待提交/已提交/得標/未得標/取消）
- 狀態標籤顏色編碼
- 統計摘要（共 X 份、進行中 X、得標 X）
- 快速更新狀態（操作選單）

**狀態顏色對照**:
- 草稿 (灰色)
- 待提交 (藍色)
- 已提交 (橙色)
- 得標 (綠色)
- 未得標 (紅色)
- 取消 (灰色)

#### 5.2 標案詳細頁面

**檔案**: `/frontend/src/pages/proposals/ProposalDetailPage.tsx`

新增功能：
- 頁首狀態標籤（大標籤顯示）
- 「更新狀態」按鈕
- 狀態歷史時間軸（自動載入）
- 得標後顯示「轉換為實績」提示

### 6. 測試

**檔案**: `/frontend/tests/unit/proposalStatus.test.ts`

涵蓋測試：
- 狀態轉換規則驗證
- 合法/非法轉換檢查
- 標籤和顏色對照
- 最終狀態判斷
- 常數完整性檢查

## 檔案清單

### 新增檔案
```
frontend/src/utils/proposalStatus.ts
frontend/src/components/proposals/UpdateStatusDialog.tsx
frontend/src/components/proposals/StatusHistoryTimeline.tsx
frontend/tests/unit/proposalStatus.test.ts
PROPOSAL_STATUS_FEATURE.md
```

### 修改檔案
```
shared/src/types/proposal.ts
frontend/src/services/api.ts
frontend/src/pages/proposals/ProposalsListPage.tsx
frontend/src/pages/proposals/ProposalDetailPage.tsx
```

## 使用方法

### 1. 標案列表頁面

**篩選標案**:
1. 使用狀態篩選下拉選單
2. 選擇特定狀態或「全部狀態」
3. 列表自動更新

**更新狀態**:
1. 點擊標案列的「...」操作按鈕
2. 選擇「更新狀態」
3. 在對話框中選擇新狀態
4. （選填）輸入備註
5. 點擊「確認更新」

### 2. 標案詳細頁面

**查看狀態歷史**:
- 頁面自動顯示狀態歷史時間軸
- 最新變更在最上方（彩色圓點標記）
- 顯示完整變更記錄（時間、操作人、備註）

**更新狀態**:
1. 點擊「更新狀態」按鈕
2. 選擇新狀態（僅顯示合法選項）
3. （選填）輸入變更原因
4. 確認更新

**得標後續動作**:
- 狀態為「得標」時，顯示「轉換為實績」按鈕
- 點擊可將標案轉為實績案例

## 技術特點

1. **型別安全**: 完整 TypeScript 型別定義
2. **狀態驗證**: 前端驗證狀態轉換合法性
3. **用戶體驗**:
   - 樂觀更新（立即反饋）
   - 錯誤處理（Toast 通知）
   - 載入狀態提示
4. **可維護性**:
   - 集中化狀態邏輯
   - 可重用組件
   - 清晰的檔案結構

## 測試執行

```bash
# 執行單元測試
cd frontend
npm test -- proposalStatus.test.ts

# 建置前端
npm run build
```

## API 依賴

前端整合依賴以下後端 API：

```
PATCH /api/v1/proposals/:id/status
GET   /api/v1/proposals/:id/status-history
```

請確保後端 API 已正確實作並部署。

## 後續優化建議

1. **E2E 測試**: 使用 Playwright 測試完整流程
2. **狀態機視覺化**: 新增狀態流程圖說明
3. **批量操作**: 支援多選標案批量更新狀態
4. **通知系統**: 狀態變更時通知相關人員
5. **權限控制**: 根據角色限制可執行的狀態轉換

## 相關文件

- 後端 API 規範: `specs/001-ai/contracts/api-spec.yaml`
- 專案狀態追蹤: `PROJECT_STATUS.md`
- 開發指南: `CLAUDE.md`

---

**狀態**: ✅ 已完成
**測試**: ✅ 通過
**建置**: ✅ 成功
