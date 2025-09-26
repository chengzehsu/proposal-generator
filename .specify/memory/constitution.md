<!--
Sync Impact Report:
- Version change: template → 1.0.0
- Added sections: Core Principles (5), Technical Architecture, Quality Standards
- Templates requiring updates: ✅ All templates synced
-->

# 智能標書產生器系統 Constitution

## Core Principles

### I. AI驅動內容生成 (NON-NEGOTIABLE)
系統必須整合Gemini 2.5 API來提供智能內容生成、優化建議和品質評估。
所有自動生成功能必須可被追蹤、可審計，並提供人工覆寫機制。
AI生成的內容必須標示來源，並允許用戶進行編輯和驗證。

**理由**: 確保系統具備真正的智能化能力，同時維持內容的可控性和透明度。

### II. 規範導向UI設計
前端必須使用shadcn/ui作為主要設計系統，Material-UI僅用於複雜資料表格和特殊組件。
所有組件必須遵循無障礙設計原則(WCAG 2.1 AA)，支援響應式設計。
用戶界面必須直觀、一致，減少學習成本。

**理由**: 確保用戶體驗的一致性和專業性，降低維護成本。

### III. 資料完整性與版本控制
公司資訊、標書內容和範本必須實施完整的版本控制。
所有資料修改必須可追蹤，關鍵資料修改需要確認機制。
系統必須支援資料回滾和變更歷史查看。

**理由**: 保護企業重要資產，確保資料的可靠性和可恢復性。

### IV. 文件品質優先
生成的標書必須完全符合選定範本的規範要求。
支援PDF、Word、ODT多格式匯出，格式保真度不得低於95%。
文件生成過程必須包含品質檢查，標示不符合規範的內容。

**理由**: 確保最終輸出符合業界標準，提高標案成功率。

### V. 安全與隱私保護
企業敏感資訊必須加密存儲，實施角色基礎的存取控制。
所有API通訊必須使用HTTPS，敏感操作需要額外驗證。
系統必須遵循GDPR和資料保護最佳實踐。

**理由**: 保護企業機密，建立用戶信任，符合法規要求。

## Technical Architecture

### Technology Stack Requirements
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui (primary) + Material-UI (selective)
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **AI Integration**: Gemini 2.5 API with proper error handling and fallback
- **Document Processing**: TipTap editor + PDFKit + officegen
- **Testing**: Jest + React Testing Library + Playwright (E2E)

### Performance Standards
- 頁面載入時間不得超過3秒
- API回應時間不得超過2秒
- 文件生成時間不得超過30秒
- 支援併發100用戶同時使用

## Quality Standards

### Development Workflow
- **規範優先**: 使用spec-kit流程，所有功能必須先建立規範
- **測試驅動**: 實施TDD，測試覆蓋率不得低於80%
- **代碼審查**: 所有變更必須通過同儕審查
- **持續整合**: 自動化測試、建置和部署流程

### Documentation Requirements
- 所有API必須有OpenAPI文件
- 組件必須有Storybook文件
- 用戶手冊必須與功能同步更新
- 技術決策必須記錄在ADR中

## Governance

**憲法優先級**: 本憲法優先於所有其他實踐和決策。如有衝突，以本憲法為準。

**修訂程序**: 憲法修訂必須包含完整的影響分析、遷移計劃和同儕審查。

**合規審查**: 所有Pull Request必須驗證憲法合規性。任何偏離必須有明確理由和權衡分析。

**Version**: 1.0.0 | **Ratified**: 2025-09-26 | **Last Amended**: 2025-09-26