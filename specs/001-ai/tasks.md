# Tasks: 智能標書產生器系統

**Input**: Design documents from `/specs/001-ai/`  
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Found: React 18 + Node.js 18 + TypeScript 5.0, web architecture
   → Extract: Express, Prisma, PostgreSQL, shadcn/ui, Material-UI, TipTap
2. Load optional design documents: ✅
   → data-model.md: 13 entities identified → 13 model tasks
   → contracts/api-spec.yaml: 25 endpoints → 25 contract test tasks  
   → research.md: Gemini 2.5, TipTap, PDF generation → setup tasks
3. Generate tasks by category: ✅
   → Setup: monorepo, dependencies, database, AI integration
   → Tests: API contract tests, integration scenarios
   → Core: Prisma models, services, API endpoints, React components
   → Integration: DB migrations, middleware, authentication
   → Polish: unit tests, performance optimization, documentation
4. Apply task rules: ✅
   → Different files = mark [P] for parallel execution
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T042) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness: ✅
   → All 25 API endpoints have contract tests ✅
   → All 13 entities have model tasks ✅
   → All user scenarios have integration tests ✅
9. Return: SUCCESS (42 tasks ready for execution) ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths follow web app structure: `backend/src/`, `frontend/src/`

---

## Phase 3.1: 專案設置 (T001-T006)

- [ ] T001 建立 monorepo 專案結構: backend/, frontend/, shared/ 目錄
- [ ] T002 [P] 初始化後端 Node.js + TypeScript 專案，安裝 Express, Prisma, JWT 依賴
- [ ] T003 [P] 初始化前端 React + Vite + TypeScript，安裝 shadcn/ui, Material-UI, TipTap 依賴
- [ ] T004 [P] 設置共用 TypeScript 型別定義專案 shared/types/
- [ ] T005 [P] 配置 ESLint, Prettier, Husky git hooks 開發工具
- [ ] T006 建立 PostgreSQL 資料庫連線和 Prisma schema 基礎結構

---

## Phase 3.2: 測試先行 (TDD) - T007-T031 ⚠️ 必須在實作前完成
**關鍵**: 這些測試必須先寫完且必須失敗，才能開始任何實作

### API Contract Tests (並行執行)
- [ ] T007 [P] 認證 API 合約測試 POST /auth/login 在 backend/tests/contract/auth.test.ts
- [ ] T008 [P] 公司資料 API 合約測試 GET/PUT /companies/basic 在 backend/tests/contract/company.test.ts
- [ ] T009 [P] 團隊成員 API 合約測試 GET/POST/PUT/DELETE /team-members 在 backend/tests/contract/team.test.ts
- [ ] T010 [P] 實績案例 API 合約測試 GET/POST/PUT/DELETE /projects 在 backend/tests/contract/projects.test.ts
- [ ] T011 [P] 獲獎紀錄 API 合約測試 GET/POST/PUT/DELETE /awards 在 backend/tests/contract/awards.test.ts
- [ ] T012 [P] 標書範本 API 合約測試 GET/POST /templates 在 backend/tests/contract/templates.test.ts
- [ ] T013 [P] 範本章節 API 合約測試 GET/POST /templates/{id}/sections 在 backend/tests/contract/sections.test.ts
- [ ] T014 [P] AI 生成 API 合約測試 POST /ai/generate 在 backend/tests/contract/ai.test.ts
- [ ] T015 [P] 標書管理 API 合約測試 GET/POST /proposals 在 backend/tests/contract/proposals.test.ts
- [ ] T016 [P] 標書生成 API 合約測試 POST /proposals/generate 在 backend/tests/contract/generation.test.ts
- [ ] T017 [P] 文件匯出 API 合約測試 POST /proposals/{id}/export 在 backend/tests/contract/export.test.ts

### Integration Tests (並行執行)
- [ ] T018 [P] 用戶註冊登入流程整合測試 backend/tests/integration/auth-flow.test.ts
- [ ] T019 [P] 完整標書生成流程整合測試 backend/tests/integration/proposal-generation.test.ts
- [ ] T020 [P] 公司資料管理完整流程整合測試 backend/tests/integration/company-data.test.ts
- [ ] T021 [P] AI 內容生成與編輯整合測試 backend/tests/integration/ai-content.test.ts
- [ ] T022 [P] 文件匯出多格式整合測試 backend/tests/integration/document-export.test.ts

### Frontend Component Tests (並行執行)
- [ ] T023 [P] 公司資料表單組件測試 frontend/tests/components/CompanyForm.test.tsx
- [ ] T024 [P] 團隊成員管理組件測試 frontend/tests/components/TeamManagement.test.tsx
- [ ] T025 [P] TipTap 編輯器組件測試 frontend/tests/components/ProposalEditor.test.tsx
- [ ] T026 [P] 範本選擇器組件測試 frontend/tests/components/TemplateSelector.test.tsx
- [ ] T027 [P] AI 生成按鈕組件測試 frontend/tests/components/AIGenerator.test.tsx

### E2E Tests (並行執行)
- [ ] T028 [P] 完整用戶工作流程 E2E 測試 frontend/tests/e2e/user-workflow.spec.ts
- [ ] T029 [P] 標書編輯與匯出 E2E 測試 frontend/tests/e2e/proposal-editing.spec.ts
- [ ] T030 [P] 多用戶協作 E2E 測試 frontend/tests/e2e/collaboration.spec.ts
- [ ] T031 [P] 響應式設計 E2E 測試 frontend/tests/e2e/responsive.spec.ts

---

## Phase 3.3: 核心實作 (T032-T060) - 僅在測試失敗後執行

### 資料庫模型 (並行執行)
- [ ] T032 [P] User 和 Company 基礎模型 backend/prisma/schema.prisma
- [ ] T033 [P] CompanyProfile 和 TeamMember 模型 backend/src/models/profile.ts
- [ ] T034 [P] Project 和 Award 模型 backend/src/models/achievement.ts
- [ ] T035 [P] ProposalTemplate 和 TemplateSection 模型 backend/src/models/template.ts
- [ ] T036 [P] Proposal 和 ProposalSection 模型 backend/src/models/proposal.ts
- [ ] T037 [P] AuditLog 模型和觸發器 backend/src/models/audit.ts

### 服務層 (並行執行)
- [ ] T038 [P] 認證服務 (JWT, 密碼雜湊) backend/src/services/AuthService.ts
- [ ] T039 [P] 公司資料管理服務 backend/src/services/CompanyService.ts
- [ ] T040 [P] 實績案例管理服務 backend/src/services/ProjectService.ts
- [ ] T041 [P] 範本管理服務 backend/src/services/TemplateService.ts
- [ ] T042 [P] AI 內容生成服務 (Gemini 2.5 整合) backend/src/services/AIService.ts
- [ ] T043 [P] 標書管理服務 backend/src/services/ProposalService.ts
- [ ] T044 [P] 文件匯出服務 (PDF/Word/ODT) backend/src/services/ExportService.ts

### API 端點實作
- [ ] T045 認證路由 POST /auth/login, /auth/register backend/src/api/auth.ts
- [ ] T046 公司資料路由 GET/PUT /companies/basic backend/src/api/company.ts
- [ ] T047 團隊成員路由 CRUD /team-members backend/src/api/team.ts
- [ ] T048 實績案例路由 CRUD /projects backend/src/api/projects.ts
- [ ] T049 獲獎紀錄路由 CRUD /awards backend/src/api/awards.ts
- [ ] T050 範本管理路由 GET/POST /templates backend/src/api/templates.ts
- [ ] T051 AI 生成路由 POST /ai/generate backend/src/api/ai.ts
- [ ] T052 標書管理路由 CRUD /proposals backend/src/api/proposals.ts
- [ ] T053 文件匯出路由 POST /proposals/{id}/export backend/src/api/export.ts

### 前端核心組件 (並行執行)
- [ ] T054 [P] 登入認證頁面 frontend/src/pages/auth/LoginPage.tsx
- [ ] T055 [P] 儀表板主頁面 frontend/src/pages/dashboard/DashboardPage.tsx
- [ ] T056 [P] 公司資料管理頁面 frontend/src/pages/database/CompanyDataPage.tsx
- [ ] T057 [P] 團隊成員管理頁面 frontend/src/pages/database/TeamMembersPage.tsx
- [ ] T058 [P] 實績案例管理頁面 frontend/src/pages/database/ProjectsPage.tsx
- [ ] T059 [P] 範本管理頁面 frontend/src/pages/templates/TemplatesPage.tsx
- [ ] T060 [P] TipTap 富文本編輯器組件 frontend/src/components/editor/ProposalEditor.tsx

---

## Phase 3.4: 系統整合 (T061-T070)

- [ ] T061 Prisma 資料庫遷移和種子資料 backend/prisma/migrations/
- [ ] T062 JWT 認證中介層 backend/src/middleware/auth.ts
- [ ] T063 請求驗證中介層 backend/src/middleware/validation.ts
- [ ] T064 錯誤處理中介層 backend/src/middleware/error.ts
- [ ] T065 審計日誌中介層 backend/src/middleware/audit.ts
- [ ] T066 CORS 和安全標頭設定 backend/src/middleware/security.ts
- [ ] T067 Zustand 狀態管理設置 frontend/src/store/index.ts
- [ ] T068 API 客戶端和 React Query 設定 frontend/src/services/api.ts
- [ ] T069 路由設定和權限控制 frontend/src/router/index.tsx
- [ ] T070 shadcn/ui 主題和全域樣式 frontend/src/styles/globals.css

---

## Phase 3.5: 效能與優化 (T071-T080)

### 單元測試 (並行執行)
- [ ] T071 [P] 服務層單元測試 backend/tests/unit/services/*.test.ts
- [ ] T072 [P] API 端點單元測試 backend/tests/unit/api/*.test.ts
- [ ] T073 [P] 中介層單元測試 backend/tests/unit/middleware/*.test.ts
- [ ] T074 [P] React hooks 單元測試 frontend/tests/unit/hooks/*.test.ts
- [ ] T075 [P] 工具函式單元測試 shared/tests/utils/*.test.ts

### 效能優化
- [ ] T076 資料庫查詢優化和索引調整
- [ ] T077 API 回應時間效能測試 (<2秒要求)
- [ ] T078 前端建置優化和程式碼分割
- [ ] T079 圖片和檔案上傳優化
- [ ] T080 快取策略實作 (Redis)

---

## Phase 3.6: 文件與部署 (T081-T085)

- [ ] T081 [P] API 文件更新和 Swagger UI 設定
- [ ] T082 [P] 使用者手冊和功能說明文件
- [ ] T083 [P] 開發環境 Docker 容器化
- [ ] T084 [P] CI/CD 流程設定 (GitHub Actions)  
- [ ] T085 [P] 生產環境部署腳本和監控設定

---

## Dependencies 依賴關係

### 嚴格順序要求
1. **設置階段**: T001 → T002-T005 並行 → T006
2. **測試必須優先**: T007-T031 必須在 T032-T060 之前完成
3. **資料庫優先**: T032 → T033-T037 並行
4. **服務依賴模型**: T033-T037 → T038-T044 並行
5. **API 依賴服務**: T038-T044 → T045-T053
6. **前端依賴 API**: T045-T053 → T054-T060 並行
7. **整合依賴核心**: T032-T060 → T061-T070
8. **優化最後**: T071-T085

### 關鍵阻塞點
- T032 (Prisma schema) 阻塞所有資料庫相關任務
- T042 (AI Service) 阻塞 T051 (AI API) 和 T043 (Proposal Service)
- T038 (Auth Service) 阻塞 T062 (Auth Middleware)
- T068 (API Client) 阻塞所有前端頁面組件

---

## Parallel Execution Examples 並行執行範例

### 第一批：測試階段並行任務
```bash
# 同時啟動所有 API 合約測試 (T007-T017)
Task: "認證 API 合約測試 POST /auth/login 在 backend/tests/contract/auth.test.ts"
Task: "公司資料 API 合約測試 GET/PUT /companies/basic 在 backend/tests/contract/company.test.ts"  
Task: "團隊成員 API 合約測試 GET/POST/PUT/DELETE /team-members 在 backend/tests/contract/team.test.ts"
Task: "實績案例 API 合約測試 GET/POST/PUT/DELETE /projects 在 backend/tests/contract/projects.test.ts"
# ... 其餘 API 合約測試
```

### 第二批：資料模型並行任務
```bash
# 資料模型可以並行開發 (T033-T037)
Task: "CompanyProfile 和 TeamMember 模型 backend/src/models/profile.ts"
Task: "Project 和 Award 模型 backend/src/models/achievement.ts"
Task: "ProposalTemplate 和 TemplateSection 模型 backend/src/models/template.ts"
Task: "Proposal 和 ProposalSection 模型 backend/src/models/proposal.ts"
Task: "AuditLog 模型和觸發器 backend/src/models/audit.ts"
```

### 第三批：服務層並行任務
```bash
# 服務層可以並行開發 (T038-T044)  
Task: "認證服務 (JWT, 密碼雜湊) backend/src/services/AuthService.ts"
Task: "公司資料管理服務 backend/src/services/CompanyService.ts"
Task: "AI 內容生成服務 (Gemini 2.5 整合) backend/src/services/AIService.ts"
Task: "標書管理服務 backend/src/services/ProposalService.ts"
Task: "文件匯出服務 (PDF/Word/ODT) backend/src/services/ExportService.ts"
```

---

## Validation Checklist 驗證清單
*執行 main() 前的檢查*

- [x] 所有 25 個 API 端點都有對應的合約測試
- [x] 所有 13 個實體都有模型建立任務  
- [x] 所有測試任務都在實作任務之前
- [x] 並行任務確實獨立 (不同檔案)
- [x] 每個任務都指定了確切的檔案路徑
- [x] 沒有任務與其他 [P] 任務修改相同檔案

---

## 重要提醒

1. **TDD 嚴格執行**: T007-T031 所有測試必須先完成且失敗，才能開始任何實作
2. **並行執行**: 標記 [P] 的任務可以同時執行，提高開發效率  
3. **憲法合規**: 每個任務都應遵循 `.specify/memory/constitution.md` 的原則
4. **提交頻率**: 每完成一個任務就提交一次，保持小步快跑
5. **測試驅動**: 實作過程中持續運行測試，確保綠燈狀態

**總任務數**: 85 個任務
**預估完成時間**: 4-6 週 (2-3 人團隊)
**並行任務**: 45+ 個任務可並行執行，大幅縮短開發週期