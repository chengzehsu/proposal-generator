# 智能標書產生器 - 部署設置指南

## 🚀 快速部署到 Zeabur

### 前置條件
1. GitHub 帳號（已完成）✅
2. Zeabur 帳號 - [註冊 Zeabur](https://zeabur.com)
3. Gemini API 密鑰 - [取得 API Key](https://ai.google.dev)

### 步驟 1: 準備 Zeabur 環境

1. **註冊並登入 Zeabur**
   ```bash
   # 安裝 Zeabur CLI（可選）
   npm install -g @zeabur/cli
   zeabur auth login
   ```

2. **創建新項目**
   - 前往 [Zeabur Dashboard](https://dash.zeabur.com)
   - 點擊 "New Project"
   - 選擇 "Import from GitHub"
   - 選擇 `chengzehsu/proposal-generator` 倉庫

### 步驟 2: 配置服務

#### 2.1 PostgreSQL 數據庫
1. 在 Zeabur 項目中點擊 "Add Service"
2. 選擇 "Database" > "PostgreSQL"
3. 等待部署完成，複製連接字串

#### 2.2 後端 API 服務
1. 點擊 "Add Service" > "Git Repository"
2. 選擇你的 GitHub 倉庫
3. 設置以下配置：
   - **Service Name**: `proposal-generator-backend`
   - **Build Command**: `npm run build:shared && npm run build:backend`
   - **Start Command**: `cd backend && npm start`
   - **Port**: `3001`

#### 2.3 前端靜態網站
1. 再次點擊 "Add Service" > "Git Repository"  
2. 選擇同一個倉庫
3. 設置以下配置：
   - **Service Name**: `proposal-generator-frontend`
   - **Build Command**: `npm run build:shared && npm run build:frontend`
   - **Output Directory**: `frontend/dist`
   - **SPA**: 啟用

### 步驟 3: 設置環境變量

在後端服務的環境變量中設置：

```bash
# 必要環境變量
DATABASE_URL=<從 PostgreSQL 服務複製>
GEMINI_API_KEY=<你的 Gemini API 密鑰>
JWT_SECRET=<生成一個 256 位密鑰>
NODE_ENV=production
PORT=3001

# 可選環境變量
FRONTEND_URL=<前端服務的 URL>
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

### 步驟 4: 設置 GitHub Secrets

在 GitHub 倉庫設置中添加以下 Secrets：

1. 前往 `https://github.com/chengzehsu/proposal-generator/settings/secrets/actions`
2. 添加以下 secrets：

```bash
DATABASE_URL=<Zeabur PostgreSQL 連接字串>
GEMINI_API_KEY=<你的 Gemini API 密鑰>
JWT_SECRET=<與 Zeabur 相同的密鑰>
```

### 步驟 5: 觸發部署

1. **自動部署**：推送任何更改到 `main` 分支
   ```bash
   git push origin main
   ```

2. **手動部署**：在 GitHub Actions 頁面手動觸發 "Deploy to Zeabur" workflow

### 步驟 6: 驗證部署

1. **檢查後端 API**
   ```bash
   curl https://your-backend-url.zeabur.app/health
   ```

2. **檢查前端應用**
   - 打開瀏覽器訪問前端 URL
   - 測試登錄功能
   - 驗證 API 連接

### 步驟 7: 設置自定義域名（可選）

1. 在 Zeabur 服務設置中點擊 "Domains"
2. 添加自定義域名
3. 更新 DNS 記錄指向 Zeabur

## 🔧 故障排除

### 常見問題

**1. 數據庫連接失敗**
- 檢查 `DATABASE_URL` 格式是否正確
- 確認 PostgreSQL 服務正在運行

**2. CI/CD 失敗**
- 檢查 GitHub Secrets 是否正確設置
- 查看 GitHub Actions 日誌了解具體錯誤

**3. 前端無法連接後端**
- 確認 `FRONTEND_URL` 和 CORS 設置
- 檢查後端服務的健康狀態

**4. AI 功能不工作**
- 確認 `GEMINI_API_KEY` 有效且有足夠配額
- 檢查 API 密鑰權限設置

### 查看日誌

```bash
# 在 Zeabur Dashboard 中
1. 選擇相應的服務
2. 點擊 "Logs" 標籤
3. 查看實時日誌輸出
```

### 手動部署（備用方案）

如果 GitHub Actions 有問題，可以使用 Zeabur CLI：

```bash
# 安裝並登入 Zeabur CLI
npm install -g @zeabur/cli
zeabur auth login

# 部署到 Zeabur
cd proposal-generator
zeabur deploy
```

## 🎯 部署檢查清單

- [ ] Zeabur 帳號已註冊
- [ ] PostgreSQL 數據庫已創建
- [ ] 後端服務已配置
- [ ] 前端服務已配置
- [ ] 環境變量已設置
- [ ] GitHub Secrets 已添加
- [ ] Gemini API 密鑰已設置
- [ ] 健康檢查通過
- [ ] 前端可以訪問
- [ ] 登錄功能正常
- [ ] AI 功能測試通過

完成以上步驟後，你的智能標書產生器就會在 Zeabur 上運行了！

---

**需要幫助？** 
- [Zeabur 文檔](https://docs.zeabur.com)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- 查看項目的 `DEPLOYMENT.md` 了解更多技術細節