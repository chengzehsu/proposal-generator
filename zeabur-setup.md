# Zeabur 部署設置指南

## 步驟 1: 在 Zeabur Dashboard 設置 GitHub 整合

1. 前往 https://zeabur.com/dashboard
2. 選擇你的 `proposal-generator` 項目
3. 在項目設置中，連接你的 GitHub repository
4. 設置自動部署觸發器：當 `main` 分支有新 commit 時自動部署

## 步驟 2: 獲取必要的 ID

在 Zeabur Dashboard 中：
- **Project ID**: 在 URL 中可以找到，格式如 `https://zeabur.com/projects/[PROJECT_ID]`
- **Service ID**: 在服務設置頁面的 URL 中，格式如 `https://zeabur.com/projects/[PROJECT_ID]/services/[SERVICE_ID]`

## 步驟 3: 在 GitHub 設置 Secrets

在你的 GitHub repository 中：
1. 前往 Settings > Secrets and variables > Actions
2. 新增以下 secrets：

```
ZEABUR_TOKEN=sk-43y654qlt5ldvrcjj63cpxc4doc27
ZEABUR_PROJECT_ID=[從 Zeabur dashboard 複製]
ZEABUR_SERVICE_ID=[從 Zeabur dashboard 複製]
DATABASE_URL=[你的生產資料庫連接字串]
JWT_SECRET=[你的 JWT 密鑰]
```

## 步驟 4: 驗證部署

1. 推送代碼到 `main` 分支
2. 檢查 GitHub Actions 頁面確認部署成功
3. 訪問 https://proposal-generator.zeabur.app 確認網站運行

## Zeabur 環境變數設置

在 Zeabur 服務設置中，確保設置以下環境變數：
- `NODE_ENV=production`
- `DATABASE_URL=[生產資料庫 URL]`
- `JWT_SECRET=[JWT 密鑰]`
- `GEMINI_API_KEY=[如果需要 AI 功能]`

## 自動部署配置

Zeabur 會自動偵測你的 `zeabur.json` 配置文件並：
- 使用 `npm run build` 建構應用
- 部署到 proposal-generator.zeabur.app
- 自動處理前端靜態文件和後端 API

## 故障排除

如果部署失敗：
1. 檢查 GitHub Actions 日誌
2. 確認所有 secrets 都正確設置
3. 檢查 Zeabur dashboard 的部署日誌
4. 確認 `zeabur.json` 配置正確