# 🚀 Zeabur 部署完整指南

## 📋 當前狀態
- ✅ GitHub Actions workflow 已修復
- ✅ zeabur.json 配置已更新 
- ⏳ 需要設置 GitHub Secrets
- ⏳ 需要獲取 Zeabur 項目 IDs

## 🔧 步驟 1: 獲取 Zeabur 項目信息

### 方法 A: 從 Zeabur Dashboard 手動獲取
1. 前往 https://zeabur.com/dashboard
2. 登入你的帳戶
3. 找到 `proposal-generator` 項目並點擊
4. 在瀏覽器 URL 中找到 PROJECT_ID:
   ```
   https://zeabur.com/projects/[這裡是 PROJECT_ID]
   ```
5. 點擊你的服務 (可能叫做 proposal-generator 或類似名稱)
6. 在 URL 中找到 SERVICE_ID:
   ```
   https://zeabur.com/projects/[PROJECT_ID]/services/[這裡是 SERVICE_ID]
   ```

### 方法 B: 使用網頁檢查器
1. 在 Zeabur Dashboard 中，按 F12 開啟開發者工具
2. 前往 Network 頁籤
3. 重新整理頁面
4. 查找 GraphQL 請求，在回應中可以找到項目和服務的 IDs

## 🔑 步驟 2: 設置 GitHub Secrets

前往你的 GitHub repository:
1. 點擊 **Settings** 頁籤
2. 在左側選單選擇 **Secrets and variables** > **Actions**
3. 點擊 **New repository secret** 並新增以下 secrets:

```bash
# 必要的 secrets
ZEABUR_TOKEN=sk-43y654qlt5ldvrcjj63cpxc4doc27
ZEABUR_PROJECT_ID=[從步驟1獲取的 PROJECT_ID]
ZEABUR_SERVICE_ID=[從步驟1獲取的 SERVICE_ID]

# 資料庫和應用設定
DATABASE_URL=postgresql://username:password@host:5432/database_name
JWT_SECRET=your-super-secret-jwt-key-here

# 選用 (如果需要 AI 功能)
GEMINI_API_KEY=your-gemini-api-key
```

## 🧪 步驟 3: 測試部署

1. 確認所有 secrets 已設置
2. 推送任何小改動到 `main` 分支，或者手動觸發 workflow:
   ```bash
   git add .
   git commit -m "test: trigger Zeabur deployment"
   git push origin main
   ```
3. 前往 GitHub Actions 頁面檢查部署狀態
4. 等待部署完成，然後訪問 https://proposal-generator.zeabur.app

## 🔍 故障排除

### 如果 GitHub Actions 失敗:
1. **檢查 secrets**: 確保所有必要的 secrets 都已正確設置
2. **檢查日誌**: 在 GitHub Actions 頁面查看詳細錯誤訊息
3. **驗證 IDs**: 確認 PROJECT_ID 和 SERVICE_ID 正確

### 如果部署成功但網站無法訪問:
1. **檢查 Zeabur 服務狀態**: 在 Zeabur dashboard 確認服務正在運行
2. **檢查域名設置**: 確認 proposal-generator.zeabur.app 已正確配置
3. **檢查環境變數**: 在 Zeabur 服務設置中確認環境變數正確

### 如果資料庫連線失敗:
1. **檢查 DATABASE_URL**: 確認格式正確且可以連線
2. **確認資料庫服務**: 確保 PostgreSQL 實例正在運行
3. **檢查防火牆**: 確認 Zeabur 可以連接到你的資料庫

## 📊 當前配置摘要

### GitHub Actions Workflow
- 觸發條件: 推送到 `main` 分支
- 建構步驟: shared → backend → frontend
- 部署工具: zeabur/deploy-action@v1

### Zeabur 配置 (zeabur.json)
- Frontend 域名: proposal-generator.zeabur.app
- Backend 域名: api.proposal-generator.zeabur.app
- 建構命令: npm run build
- 靜態文件輸出: frontend/dist

### 自動化流程
1. 推送代碼到 main
2. GitHub Actions 觸發
3. 安裝依賴並建構
4. 部署到 Zeabur
5. 自動更新 proposal-generator.zeabur.app

## 🎯 下一步行動

1. [ ] 獲取 ZEABUR_PROJECT_ID 和 ZEABUR_SERVICE_ID
2. [ ] 在 GitHub 設置所有必要的 secrets
3. [ ] 測試推送並驗證自動部署
4. [ ] 確認網站在 proposal-generator.zeabur.app 正常運行

完成這些步驟後，你的智能標案產生器就會自動部署到 Zeabur 了！🎉