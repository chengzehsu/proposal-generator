# 智能標書產生器系統快速入門指南

**Feature Branch**: `001-ai`  
**Created**: 2025-09-26  
**Status**: Draft  

本指南提供智能標書產生器系統的快速設定和驗證流程，確保開發環境正確配置並能執行核心功能。

---

## 前置需求

### 開發環境
- **Node.js**: v18.x 或更高版本
- **npm**: v9.x 或更高版本  
- **PostgreSQL**: v14.x 或更高版本
- **Git**: v2.30 或更高版本

### 必要工具
```bash
# 安裝全域工具
npm install -g typescript ts-node
npm install -g @prisma/cli

# 驗證安裝
node --version    # v18.x+
npm --version     # v9.x+
psql --version    # PostgreSQL 14.x+
```

### 環境變數設定
建立 `.env` 檔案：
```env
# 資料庫連線
DATABASE_URL="postgresql://username:password@localhost:5432/proposal_generator?schema=public"

# JWT 設定
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Gemini API
GEMINI_API_KEY="your-gemini-api-key"

# 檔案上傳
UPLOAD_MAX_SIZE="10MB"
UPLOAD_DIR="./uploads"

# CORS 設定
FRONTEND_URL="http://localhost:3000"

# 效能設定
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# 日誌設定
LOG_LEVEL="info"
```

---

## 快速設定步驟

### 1. 複製專案並安裝依賴
```bash
# 進入專案目錄
cd proposal-generator

# 安裝後端依賴
cd backend
npm install

# 安裝前端依賴  
cd ../frontend
npm install

# 安裝共用依賴
cd ../shared
npm install
```

### 2. 資料庫設定
```bash
# 建立 PostgreSQL 資料庫
createdb proposal_generator

# 回到後端目錄
cd ../backend

# 運行資料庫遷移
npx prisma migrate dev --name init

# 載入種子資料
npx prisma db seed
```

### 3. 啟動開發伺服器
```bash
# 終端機 1: 啟動後端伺服器
cd backend
npm run dev

# 終端機 2: 啟動前端開發伺服器  
cd frontend
npm run dev

# 終端機 3: 監控共用型別變更
cd shared
npm run watch
```

### 4. 驗證安裝
開啟瀏覽器訪問 `http://localhost:3000`，應該看到：
- ✅ 登入頁面正常顯示
- ✅ 可以進行使用者註冊
- ✅ API 端點回應正常

---

## 核心功能驗證測試

### 測試腳本執行
```bash
# 執行後端單元測試
cd backend
npm test

# 執行前端組件測試
cd ../frontend  
npm test

# 執行 E2E 整合測試
npm run test:e2e
```

### 手動功能驗證

#### 1. 用戶認證流程
```bash
# 使用 curl 測試登入 API
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

# 預期回應: JWT token 和用戶資訊
```

#### 2. 公司資料管理
1. 登入系統後進入「公司資料管理」
2. 填寫基本資料：公司名稱、統編、地址等
3. 新增團隊成員資訊
4. 建立實績案例記錄
5. 驗證資料正確儲存並可編輯

#### 3. AI 內容生成測試
```bash
# 測試 Gemini API 連接
curl -X POST http://localhost:3001/api/v1/ai/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "template-uuid",
    "section_id": "section-uuid",
    "custom_prompt": "生成公司簡介"
  }'

# 預期回應: AI 生成的內容和信心分數
```

#### 4. 標書生成流程
1. 選擇「政府補助」範本
2. 點擊「AI 生成標書」
3. 確認各章節自動填入相關公司資料
4. 使用編輯器修改內容
5. 匯出為 PDF 格式
6. 驗證文件格式正確

### 效能驗證
```bash
# 安裝負載測試工具
npm install -g artillery

# 執行 API 效能測試
cd backend
npm run test:performance

# 驗證指標:
# - API 回應時間 < 2秒
# - 100 並發用戶支援
# - 記憶體使用 < 500MB
```

---

## 故障排除指南

### 常見問題

#### 資料庫連線錯誤
```bash
# 檢查 PostgreSQL 是否運行
pg_ctl status

# 重新啟動 PostgreSQL
brew services restart postgresql  # macOS
sudo systemctl restart postgresql  # Linux

# 驗證連線設定
npx prisma db pull
```

#### Gemini API 錯誤
```bash
# 驗證 API 金鑰
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models

# 檢查配額和限制
echo "當前 API 金鑰: $GEMINI_API_KEY"
```

#### 前端建置錯誤
```bash
# 清除快取
cd frontend
rm -rf node_modules package-lock.json
npm install

# 檢查 TypeScript 錯誤
npm run type-check

# 檢查 ESLint 錯誤
npm run lint
```

#### 檔案上傳問題
```bash
# 檢查上傳目錄權限
ls -la ./uploads/

# 建立上傳目錄
mkdir -p ./uploads
chmod 755 ./uploads
```

### 日誌除錯
```bash
# 查看後端日誌
tail -f backend/logs/app.log

# 查看資料庫查詢日誌
tail -f backend/logs/query.log

# 查看錯誤日誌
tail -f backend/logs/error.log
```

---

## 開發流程驗證

### Git 工作流程
```bash
# 建立功能分支
git checkout -b feature/company-data-crud

# 提交變更
git add .
git commit -m "feat: add company data CRUD endpoints"

# 推送並建立 PR
git push origin feature/company-data-crud
```

### 程式碼品質檢查
```bash
# 執行所有品質檢查
npm run check:all

# 包含:
# - TypeScript 型別檢查
# - ESLint 程式碼規範
# - Prettier 格式化  
# - 單元測試
# - 整合測試
```

### 建置流程驗證
```bash
# 建置後端產品版本
cd backend
npm run build

# 建置前端產品版本  
cd ../frontend
npm run build

# 驗證建置產物
ls -la dist/
```

---

## 下一步

完成快速入門後，建議：

1. **閱讀完整文件**: 參考 `data-model.md` 了解資料結構
2. **API 文件**: 查看 `contracts/api-spec.yaml` 了解完整 API
3. **開發指南**: 遵循專案憲法 `.specify/memory/constitution.md`
4. **貢獻代碼**: 查看 `/tasks` 命令生成的開發任務

### 有用的指令
```bash
# 重設開發環境
npm run reset:dev

# 產生測試資料
npm run seed:test-data

# 備份開發資料庫
npm run db:backup

# 檢查系統健康狀態
npm run health:check
```

---

## 支援與協助

如遇到問題，請：
1. 檢查本文件的故障排除章節
2. 查看專案 Issues
3. 聯繫開發團隊

**重要**: 確保所有測試通過後再進入功能開發階段。