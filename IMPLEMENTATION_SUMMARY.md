# 自動儲存失敗處理機制 - 實作總結

## 實作完成

已成功實作標書編輯器的自動儲存失敗處理機制，包含本地備份、自動恢復和離線編輯功能。

## 新增檔案

### Hooks (3 個)

1. **`frontend/src/hooks/useOfflineStorage.ts`**
   - 本地儲存管理
   - 支援 LocalStorage 讀寫
   - 監聽跨視窗 storage 事件
   - 錯誤處理和日誌記錄

2. **`frontend/src/hooks/useBeforeUnload.ts`**
   - 離開頁面前確認
   - beforeunload 事件監聽
   - 可選自訂提示訊息

3. **`frontend/src/hooks/useAutoSave.ts` (增強)**
   - 加入離線儲存支援
   - 網路狀態監聽 (online/offline)
   - 自動同步機制
   - 儲存失敗備份

### 工具函數

4. **`frontend/src/utils/formatTime.ts`**
   - `formatRelativeTime()` - 相對時間格式化
   - `formatDateTime()` - 完整日期時間
   - `formatTime()` - 時間格式化
   - `formatDate()` - 日期格式化

### 測試檔案 (3 個)

5. **`frontend/tests/unit/useAutoSave.test.ts`**
   - 自動儲存測試
   - 離線備份測試
   - 網路恢復同步測試
   - 儲存失敗處理測試

6. **`frontend/tests/unit/useOfflineStorage.test.ts`**
   - LocalStorage 讀寫測試
   - 函數式更新測試
   - 跨視窗同步測試

7. **`frontend/tests/unit/formatTime.test.ts`**
   - 時間格式化測試
   - 邊界條件測試

### 文檔

8. **`frontend/docs/AUTO_SAVE_GUIDE.md`**
   - 完整使用指南
   - API 文檔
   - 最佳實踐
   - 常見問題

## 修改檔案

### 核心功能整合

1. **`frontend/src/pages/editor/ProposalEditorPage.tsx`**
   - 整合 useAutoSave Hook (支援離線)
   - 整合 useBeforeUnload Hook
   - 草稿恢復邏輯
   - UI 狀態指示器 (離線模式、儲存狀態)
   - 錯誤提示和警告訊息

### 匯出更新

2. **`frontend/src/hooks/index.ts`**
   - 匯出 useOfflineStorage
   - 匯出 useBeforeUnload

## 技術規格

### 功能特性

- ✅ **自動儲存**: 2 秒防抖，智能跳過重複儲存
- ✅ **離線備份**: 網路中斷時儲存到 LocalStorage
- ✅ **自動同步**: 網路恢復後 1 秒自動同步
- ✅ **草稿恢復**: 頁面載入時提示恢復本地草稿
- ✅ **離開確認**: 未儲存變更時提示用戶
- ✅ **狀態顯示**: 清晰的 UI 指示器和提示訊息

### UI/UX

- 離線模式標籤 (Chip)
- 儲存狀態圖示 (CircularProgress, CheckCircle, ErrorIcon, WifiOff)
- 相對時間顯示 ("剛剛", "5 分鐘前")
- 離線警告 (Alert)
- 錯誤提示 (Alert)
- 草稿恢復確認對話框

### 網路狀態處理

```typescript
// 監聽網路狀態
window.addEventListener('online', handleOnline)
window.addEventListener('offline', handleOffline)

// 離線時
if (isOffline) {
  localStorage.setItem(key, content)
  status = SaveStatus.OFFLINE
}

// 網路恢復時
if (!isOffline && hasLocalBackup) {
  setTimeout(() => save(), 1000) // 延遲 1 秒同步
}
```

### 錯誤處理

```typescript
try {
  await onSave(content)
  clearOfflineBackup() // 成功後清除備份
} catch (error) {
  setOfflineBackup(content) // 失敗時備份
  showError(error.message)
}
```

## 測試涵蓋範圍

### useAutoSave
- ✅ 內容變更後自動儲存
- ✅ 網路中斷時儲存到 LocalStorage
- ✅ 網路恢復後自動同步
- ✅ 儲存失敗時備份到 LocalStorage
- ✅ 手動儲存立即執行
- ✅ 成功儲存後清除離線備份

### useOfflineStorage
- ✅ 使用初始值初始化
- ✅ 從 LocalStorage 讀取現有值
- ✅ 更新值並同步到 LocalStorage
- ✅ 支援函數式更新
- ✅ 移除值
- ✅ 處理複雜物件
- ✅ 解析錯誤時使用初始值
- ✅ 監聽其他視窗的 storage 變更

### formatTime
- ✅ 顯示「剛剛」(< 1 分鐘)
- ✅ 顯示分鐘數 (< 1 小時)
- ✅ 顯示小時數 (< 1 天)
- ✅ 顯示天數 (< 7 天)
- ✅ 顯示完整日期 (> 7 天)
- ✅ 處理未來時間

## 效能優化

- **防抖機制**: 避免頻繁 API 呼叫
- **智能跳過**: 內容無變更時不觸發儲存
- **非同步操作**: 不阻塞 UI 渲染
- **Ref 管理**: 使用 isSavingRef 避免重複儲存

## 程式碼品質

- ✅ TypeScript 嚴格模式
- ✅ ESLint 檢查通過
- ✅ 編譯成功 (Vite build)
- ✅ 完整的 JSDoc 註解
- ✅ 錯誤處理和日誌記錄

## 使用範例

```typescript
import { useAutoSave, useBeforeUnload } from '@/hooks'
import { formatRelativeTime } from '@/utils/formatTime'

const ProposalEditor = ({ proposalId }) => {
  const [content, setContent] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  const { status, lastSaved, isOffline, save } = useAutoSave({
    data: content,
    onSave: async (newContent) => {
      await api.updateProposal(proposalId, newContent)
    },
    storageKey: `proposal_draft_${proposalId}`,
    enableOfflineBackup: true
  })

  useBeforeUnload(hasChanges, '您有未儲存的變更')

  return (
    <div>
      {isOffline && <Alert severity="warning">離線模式</Alert>}

      <Box>
        {status === SaveStatus.SAVED && lastSaved && (
          <Typography variant="caption">
            已儲存 {formatRelativeTime(lastSaved)}
          </Typography>
        )}
      </Box>

      <Editor value={content} onChange={setContent} />
      <Button onClick={save}>手動儲存</Button>
    </div>
  )
}
```

## 瀏覽器相容性

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+
- 移動端完整支援

## 安全考量

- LocalStorage 未加密，避免儲存敏感資料
- 使用 JSON.stringify/parse 處理資料
- 受同源政策保護

## 後續擴展建議

1. **加密儲存**: 敏感內容本地加密
2. **IndexedDB**: 大型內容使用 IndexedDB
3. **版本衝突**: 檢測並處理版本衝突
4. **批次上傳**: 離線期間多次變更批次上傳
5. **壓縮**: 大型內容壓縮儲存
6. **清理機制**: 自動清理過期草稿

## 完成標準

- ✅ 自動儲存正常運作 (2 秒防抖)
- ✅ 網路中斷時內容備份到 LocalStorage
- ✅ 網路恢復時自動同步
- ✅ 離開頁面前提示未儲存變更
- ✅ UI 清楚顯示儲存狀態
- ✅ 草稿恢復功能正常
- ✅ 測試案例完整
- ✅ 文檔完善

## 檔案清單

```
frontend/src/hooks/
  ├── useOfflineStorage.ts       (新增)
  ├── useBeforeUnload.ts          (新增)
  ├── useAutoSave.ts              (增強)
  └── index.ts                    (更新)

frontend/src/utils/
  └── formatTime.ts               (新增)

frontend/src/pages/editor/
  └── ProposalEditorPage.tsx      (更新)

frontend/tests/unit/
  ├── useAutoSave.test.ts         (新增)
  ├── useOfflineStorage.test.ts   (新增)
  └── formatTime.test.ts          (新增)

frontend/docs/
  └── AUTO_SAVE_GUIDE.md          (新增)
```

---

**實作完成日期**: 2025-10-05
**開發者**: Claude Code (前端開發專員)
**任務狀態**: ✅ 全部完成
