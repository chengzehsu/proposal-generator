# 部署指南

## GitHub + Zeabur 部署配置

### 必要的 GitHub Secrets

在 GitHub 倉庫設置中添加以下 Secrets：

```
ZEABUR_TOKEN=your-zeabur-api-token
ZEABUR_PROJECT_ID=your-zeabur-project-id  
ZEABUR_SERVICE_ID=your-zeabur-service-id
DATABASE_URL=postgresql://user:pass@host:5432/db
GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET=your-jwt-secret-256-bits
```

### Zeabur 配置

1. **創建 Zeabur 項目**
   ```bash
   # 安裝 Zeabur CLI
   npm install -g @zeabur/cli
   
   # 登入 Zeabur
   zeabur auth login
   
   # 創建項目
   zeabur project create proposal-generator
   ```

2. **配置服務**
   - Backend: Node.js 服務，端口 3001
   - Frontend: 靜態網站服務
   - Database: PostgreSQL 14+

3. **環境變量設置**
   - 復制 `.env.production.example` 的內容
   - 在 Zeabur 控制面板中設置環境變量
   - 數據庫 URL 由 Zeabur 自動提供

### 部署流程

1. **自動部署**
   - 推送到 `main` 分支觸發自動部署
   - GitHub Actions 運行測試和構建
   - 成功後自動部署到 Zeabur

2. **手動部署**
   ```bash
   # 在 GitHub Actions 頁面手動觸發 Deploy workflow
   # 或使用 Zeabur CLI
   zeabur deploy
   ```

### 監控和維護

- **健康檢查**: `/health` 端點
- **日誌**: Zeabur 控制面板查看
- **數據庫**: 通過 Zeabur 控制面板管理
- **域名**: 在 Zeabur 中設置自定義域名

### 故障排除

1. **部署失敗**
   - 檢查 GitHub Actions 日誌
   - 確認環境變量設置正確
   - 檢查 Zeabur 服務狀態

2. **數據庫連接問題**
   - 確認 DATABASE_URL 格式正確
   - 檢查 Prisma 遷移狀態
   - 查看 Zeabur 數據庫日誌

3. **API 錯誤**
   - 檢查 CORS 設置
   - 確認 JWT_SECRET 配置
   - 驗證 Gemini API 密鑰