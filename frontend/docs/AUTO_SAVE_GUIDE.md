# 自動儲存失敗處理機制 - 使用指南

## 概述

標書編輯器的自動儲存系統提供了完善的離線支援和失敗處理機制，確保用戶內容不會因網路問題或系統錯誤而遺失。

## 核心功能

### 1. 自動儲存
- **防抖延遲**: 2 秒內容變更後觸發自動儲存
- **定期儲存**: 每 30 秒自動檢查並儲存變更
- **智能跳過**: 內容無變更時不觸發儲存

### 2. 離線備份
- **網路中斷檢測**: 即時監聽網路狀態
- **本地儲存**: 離線時自動儲存到 LocalStorage
- **視覺提示**: 離線模式顯示警告標籤

### 3. 自動同步
- **網路恢復檢測**: 監聽 online 事件
- **延遲同步**: 網路恢復後 1 秒自動同步本地備份
- **成功清理**: 同步成功後清除本地備份

### 4. 草稿恢復
- **頁面載入檢測**: 檢查是否有未同步的本地草稿
- **用戶確認**: 提示用戶選擇恢復草稿或載入伺服器版本
- **智能比對**: 只在草稿與伺服器版本不同時提示

### 5. 離開確認
- **變更偵測**: 監聽頁面卸載事件
- **確認提示**: 有未儲存變更時提示用戶
- **瀏覽器原生**: 使用 beforeunload 確保可靠性

## Hook API

### useAutoSave

```typescript
const {
  status,        // 儲存狀態: IDLE | SAVING | SAVED | ERROR | OFFLINE
  lastSaved,     // 最後儲存時間
  error,         // 錯誤訊息
  isOffline,     // 是否離線
  save,          // 手動儲存函數
  clearOfflineBackup // 清除離線備份函數
} = useAutoSave({
  data: content,           // 要儲存的資料
  onSave: async (data) => {}, // 儲存函數
  delay: 2000,            // 防抖延遲 (毫秒)
  enabled: true,          // 是否啟用自動儲存
  storageKey: 'key',      // LocalStorage 鍵名
  enableOfflineBackup: true, // 是否啟用離線備份
  onSuccess: () => {},    // 成功回調
  onError: (error) => {}  // 錯誤回調
})
```

### useOfflineStorage

```typescript
const [
  storedValue,   // 儲存的值
  setValue,      // 設定值函數
  removeValue    // 移除值函數
] = useOfflineStorage('key', initialValue)
```

### useBeforeUnload

```typescript
useBeforeUnload(
  hasUnsavedChanges,  // 是否有未儲存變更
  'Custom message'    // 自訂提示訊息 (可選)
)
```

## 使用範例

### 基本使用

```typescript
import { useAutoSave, useBeforeUnload } from '@/hooks'

const MyEditor = () => {
  const [content, setContent] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // 自動儲存
  const { status, isOffline, save } = useAutoSave({
    data: content,
    onSave: async (newContent) => {
      await api.saveContent(newContent)
    },
    storageKey: 'my_draft',
    enableOfflineBackup: true
  })

  // 離開確認
  useBeforeUnload(hasChanges, '您有未儲存的變更')

  return (
    <div>
      {isOffline && <Alert>離線模式</Alert>}
      <Editor value={content} onChange={setContent} />
      <Button onClick={save}>手動儲存</Button>
    </div>
  )
}
```

### 狀態顯示

```typescript
const getStatusText = () => {
  if (isOffline) return '離線編輯'

  switch (status) {
    case SaveStatus.SAVING: return '儲存中...'
    case SaveStatus.SAVED: return `已儲存 ${formatRelativeTime(lastSaved)}`
    case SaveStatus.ERROR: return `儲存失敗: ${error.message}`
    default: return ''
  }
}

const getStatusIcon = () => {
  if (isOffline) return <WifiOff color="warning" />

  switch (status) {
    case SaveStatus.SAVING: return <CircularProgress size={16} />
    case SaveStatus.SAVED: return <CheckCircle color="success" />
    case SaveStatus.ERROR: return <ErrorIcon color="error" />
  }
}
```

## UI/UX 最佳實踐

### 1. 狀態指示器

```tsx
<Box display="flex" alignItems="center" gap={1}>
  {getStatusIcon()}
  <Typography variant="caption">
    {getStatusText()}
  </Typography>
</Box>
```

### 2. 離線模式提示

```tsx
{isOffline && (
  <Alert severity="warning">
    <WifiOff fontSize="small" />
    目前處於離線模式，內容將儲存在本機。網路恢復後會自動同步。
  </Alert>
)}
```

### 3. 錯誤提示

```tsx
{status === SaveStatus.ERROR && (
  <Alert severity="error">
    儲存失敗: {error.message}。內容已備份至本機。
  </Alert>
)}
```

### 4. 草稿恢復提示

```tsx
useEffect(() => {
  if (draftContent && draftContent !== serverContent) {
    const shouldRestore = window.confirm(
      '發現本地儲存的草稿，是否恢復？\n\n' +
      '點擊「確定」恢復草稿，點擊「取消」載入伺服器版本。'
    )

    if (shouldRestore) {
      setContent(draftContent)
    } else {
      clearDraft()
    }
  }
}, [proposal, draftContent])
```

## 測試場景

### 1. 正常儲存
- 編輯內容 → 等待 2 秒 → 自動儲存成功

### 2. 網路中斷
- 編輯內容 → 斷開網路 → 內容儲存到 LocalStorage → 顯示離線提示

### 3. 網路恢復
- 離線模式 → 恢復網路 → 自動同步本地備份 → 清除 LocalStorage

### 4. 儲存失敗
- 編輯內容 → API 錯誤 → 備份到 LocalStorage → 顯示錯誤提示

### 5. 草稿恢復
- 有本地草稿 → 重新載入頁面 → 提示恢復 → 選擇恢復或放棄

### 6. 離開確認
- 有未儲存變更 → 嘗試關閉頁面 → 瀏覽器確認提示

## 技術細節

### LocalStorage 鍵名規範
```
proposal_draft_{proposalId}  // 標書草稿
auto_save_backup             // 通用備份
```

### 網路狀態監聽
```typescript
window.addEventListener('online', handleOnline)
window.addEventListener('offline', handleOffline)
```

### 防抖實作
```typescript
const debouncedData = useDebounce(data, 2000)
```

### 時間格式化
```typescript
formatRelativeTime(lastSaved)
// 輸出: "剛剛" | "5 分鐘前" | "2 小時前" | "3 天前"
```

## 常見問題

### Q: LocalStorage 容量限制？
A: 大部分瀏覽器支援 5-10MB，足夠儲存標書草稿。超過限制會拋出錯誤。

### Q: 多視窗同步？
A: useOfflineStorage 監聽 storage 事件，支援同一瀏覽器多視窗同步。

### Q: 私密模式支援？
A: 私密模式下 LocalStorage 可用，但關閉視窗後會清空。

### Q: 如何清理過期草稿？
A: 成功儲存後自動清除，或手動呼叫 `clearOfflineBackup()`。

## 效能考量

- **防抖延遲**: 避免頻繁 API 呼叫
- **智能跳過**: 內容無變更時不觸發
- **非同步儲存**: 不阻塞 UI
- **狀態管理**: 使用 ref 避免不必要的重渲染

## 安全性

- **資料加密**: LocalStorage 未加密，避免儲存敏感資料
- **XSS 防護**: 使用 JSON.stringify/parse 處理資料
- **同源政策**: LocalStorage 受同源政策保護

## 瀏覽器相容性

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge 12+
- iOS Safari 3.2+
- Android 2.1+

## 進階配置

### 自訂儲存間隔

```typescript
useAutoSave({
  data: content,
  onSave: saveFunction,
  delay: 5000, // 5 秒防抖
  interval: 60000 // 每 60 秒定期儲存 (未實作，可擴展)
})
```

### 批次操作

```typescript
const { save, clearOfflineBackup } = useAutoSave({...})

// 手動觸發儲存
await save()

// 清理備份
clearOfflineBackup()
```

## 除錯

### 啟用日誌

```typescript
import { logger } from '@/utils/logger'

logger.setLevel('debug') // 顯示詳細日誌
```

### 檢查 LocalStorage

```typescript
// 瀏覽器控制台
localStorage.getItem('proposal_draft_123')
```

### 模擬離線

```typescript
// 瀏覽器控制台
window.dispatchEvent(new Event('offline'))
```

---

**版本**: 1.0.0
**最後更新**: 2025-10-05
