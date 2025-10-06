# Zeabur 部署指南

## 📋 前置準備

### 1. 安裝 Zeabur CLI

```bash
# macOS/Linux
curl -fsSL https://cli.zeabur.com/install.sh | bash

# 或使用 npm
npm install -g @zeabur/cli

# 驗證安裝
zeabur --version
```

### 2. 登入 Zeabur

```bash
zeabur auth login
```

---

## 🔐 環境變數設定

### 生成強隨機密鑰

```bash
# 生成 JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成 JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 設定 Zeabur 環境變數

```bash
# 1. JWT 密鑰（必須）
zeabur env set JWT_SECRET=<剛才生成的64字元隨機密鑰>
zeabur env set JWT_REFRESH_SECRET=<另一個64字元隨機密鑰>

# 2. Gemini API Key（必須）
zeabur env set GEMINI_API_KEY=<your-gemini-api-key>

# 3. 環境設定
zeabur env set NODE_ENV=production

# 4. 前端 URL（部署後設定）
zeabur env set FRONTEND_URL=https://your-frontend-app.zeabur.app

# 5. 資料庫連線（如果使用 Zeabur PostgreSQL，會自動設定）
# 如果手動設定：
# zeabur env set DATABASE_URL=postgresql://user:pass@host:5432/dbname

# 6. 其他選用設定
zeabur env set LOG_LEVEL=info
zeabur env set BCRYPT_ROUNDS=12
```

### 查看已設定的環境變數

```bash
# 列出所有環境變數
zeabur env list

# 查看特定環境變數
zeabur env get JWT_SECRET
```

### 刪除環境變數

```bash
zeabur env unset JWT_SECRET
```

---

## 🚀 部署流程

### 方法 1: Git 自動部署（推薦）

1. **推送代碼到 GitHub**

```bash
git add .
git commit -m "準備部署到 Zeabur"
git push origin main
```

2. **在 Zeabur Dashboard 連接 GitHub 倉庫**
   - 登入 [Zeabur Dashboard](https://dash.zeabur.com)
   - 新增專案 → 選擇 Git 倉庫
   - 選擇 `proposal-generator` 倉庫
   - Zeabur 會自動檢測 monorepo 結構

3. **配置服務**
   - Backend: 自動檢測 `backend/` 目錄
   - Frontend: 自動檢測 `frontend/` 目錄
   - 設定環境變數（參考上方）

### 方法 2: CLI 部署

```bash
# 從專案根目錄
cd /path/to/proposal-generator

# 部署後端
cd backend
zeabur deploy

# 部署前端
cd ../frontend
zeabur deploy
```

---

## 🔧 後端服務配置

### 1. 建立 `zeabur.yaml`（可選）

在 `backend/` 目錄創建：

```yaml
# backend/zeabur.yaml
service:
  name: proposal-generator-backend
  build:
    dockerfile: Dockerfile
  env:
    PORT: 3001
    NODE_ENV: production
  healthCheck:
    path: /health
    interval: 30s
    timeout: 10s
```

### 2. Dockerfile 優化

確保 `backend/Dockerfile` 適合生產環境：

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package files
COPY package*.json ./
COPY prisma ./prisma/

# 安裝依賴（包含 devDependencies 用於建構）
RUN npm ci

# 複製源碼
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 建構 TypeScript
RUN npm run build

# 生產階段
FROM node:18-alpine

WORKDIR /app

# 複製 package files
COPY package*.json ./
COPY prisma ./prisma/

# 只安裝生產依賴
RUN npm ci --only=production

# 生成 Prisma Client
RUN npx prisma generate

# 從 builder 階段複製建構結果
COPY --from=builder /app/dist ./dist

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# 啟動應用
CMD ["node", "dist/index.js"]
```

---

## 🗄️ 資料庫設定

### 使用 Zeabur PostgreSQL（推薦）

1. **在 Zeabur Dashboard 新增 PostgreSQL 服務**
   - 專案頁面 → Add Service → PostgreSQL
   - Zeabur 會自動設定 `DATABASE_URL` 環境變數

2. **執行資料庫遷移**

```bash
# 連接到部署的後端服務
zeabur exec -- npx prisma migrate deploy

# 或在本地執行（需要 DATABASE_URL）
DATABASE_URL=<zeabur-postgres-url> npx prisma migrate deploy
```

### 使用外部資料庫

```bash
# 設定自訂資料庫 URL
zeabur env set DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## 🌐 前端配置

### 1. 設定 API 端點

在 `frontend/.env.production` 或透過 Zeabur：

```bash
# 設定後端 API URL（Zeabur 自動分配域名後）
zeabur env set VITE_API_URL=https://your-backend-app.zeabur.app/api/v1
```

### 2. 建構優化

確保 `frontend/vite.config.ts` 有正確的生產配置：

```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
        }
      }
    }
  }
})
```

---

## ✅ 部署檢查清單

### 部署前

- [ ] 已設定所有必要的環境變數
- [ ] JWT_SECRET 和 JWT_REFRESH_SECRET 使用強隨機密鑰
- [ ] GEMINI_API_KEY 已設定
- [ ] 資料庫連線已配置
- [ ] `.env` 檔案在 `.gitignore` 中
- [ ] 所有測試通過 (`npm test`)
- [ ] TypeScript 編譯無錯誤 (`npm run type-check`)
- [ ] ESLint 檢查通過 (`npm run lint`)

### 部署後

- [ ] 健康檢查端點正常 (`/health`)
- [ ] 前端可以連接到後端 API
- [ ] 用戶可以成功註冊和登入
- [ ] 資料庫遷移已執行
- [ ] CORS 設定正確（FRONTEND_URL）
- [ ] 檢查日誌無異常錯誤

---

## 📊 監控與日誌

### 查看服務日誌

```bash
# 即時日誌
zeabur logs -f

# 最近的日誌
zeabur logs --tail 100
```

### 健康檢查

```bash
# 檢查後端健康狀態
curl https://your-backend-app.zeabur.app/health

# 預期回應
{
  "status": "ok",
  "timestamp": "2025-10-01T...",
  "uptime": 12345
}
```

---

## 🔄 更新部署

### 自動部署

推送到 GitHub 後，Zeabur 會自動重新部署：

```bash
git add .
git commit -m "更新功能"
git push origin main
```

### 手動觸發部署

```bash
zeabur deploy --force
```

---

## 🐛 故障排除

### 1. 應用無法啟動

檢查環境變數是否設定：

```bash
zeabur env list
```

檢查日誌：

```bash
zeabur logs --tail 100
```

### 2. 資料庫連線失敗

驗證 DATABASE_URL：

```bash
zeabur env get DATABASE_URL
```

手動測試連線：

```bash
zeabur exec -- npx prisma db pull
```

### 3. CORS 錯誤

確認 FRONTEND_URL 設定正確：

```bash
zeabur env get FRONTEND_URL

# 如果需要更新
zeabur env set FRONTEND_URL=https://your-frontend-app.zeabur.app
```

### 4. JWT Token 無效

確認密鑰一致性：

```bash
# 檢查是否使用預設值
zeabur env get JWT_SECRET

# 如果是預設值，重新生成並設定
zeabur env set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
```

---

## 📚 相關文件

- [Zeabur 官方文件](https://zeabur.com/docs)
- [Zeabur CLI 文件](https://zeabur.com/docs/cli)
- [專案 DEPLOYMENT.md](./DEPLOYMENT.md)
- [環境變數範本](./.env.example)

---

## 🔒 安全最佳實踐

1. **絕對不要**在 Git 中提交 `.env` 檔案
2. **定期輪換** JWT 密鑰（每 90 天）
3. **使用強隨機密鑰**（至少 64 字元）
4. **啟用 HTTPS**（Zeabur 自動提供）
5. **監控日誌**，檢測異常活動
6. **定期更新依賴**，修補安全漏洞

```bash
# 定期檢查漏洞
npm audit

# 自動修復
npm audit fix
```

---

**最後更新**: 2025-10-01
**維護者**: 智能標案產生器團隊
