# Claude Commands 備份說明

**備份日期**: 2025-10-05
**備份原因**: 專案核心功能已 100% 完成，規範驅動開發階段結束

## 備份內容

### `.claude/commands/` - Spec-Kit 命令
這些命令用於規範驅動開發工作流程：

1. **`/specify`** - 建立功能規範 ✅ 已完成使用 (001-ai)
2. **`/clarify`** - 需求澄清 (5 問答限制)
3. **`/constitution`** - 專案憲法管理 ✅ 已完成 (v1.0.0)
4. **`/plan`** - 技術計劃生成 ✅ 已完成使用
5. **`/tasks`** - 任務分解 ✅ 已完成使用 (57/57)
6. **`/implement`** - 執行實作 ✅ 已完成使用
7. **`/analyze`** - 規範一致性分析 (未使用)

### `.specify/` - Spec-Kit 基礎設施
- `memory/constitution.md` - 專案憲法 (v1.0.0)
- `scripts/bash/` - 工作流程腳本
- `templates/` - 規範模板

## 為何移除

### 1. 專案階段變化
- **Phase 1-5**: 規範驅動開發 → **已完成 100%**
- **Phase 6**: 系統整合與測試 → **需要執行命令，非規範命令**

### 2. 文檔整合
現有文檔已提供完整指引：
- `CLAUDE.md` - 開發工作流程和架構
- `AGENTS.md` - 專員角色和當前任務
- `PROJECT_STATUS.md` - 任務追蹤和進度

### 3. 避免混淆
- 兩套命令系統可能造成混淆
- 單一真實來源更易維護

## 如何恢復

如需恢復 Spec-Kit 命令系統 (例如新增功能 002-*):

```bash
# 恢復 .claude 目錄
cp -r docs/archive/claude-commands-backup/.claude/ .

# 恢復 .specify 目錄 (如已刪除)
cp -r docs/archive/claude-commands-backup/.specify/ .
```

## 規範文件保留

所有已完成的規範文件保留在 `specs/001-ai/`:
- ✅ `spec.md` - 功能規範
- ✅ `plan.md` - 技術計劃
- ✅ `tasks.md` - 任務分解
- ✅ `data-model.md` - 資料模型
- ✅ `contracts/` - API 合約
- ✅ `research.md` - 技術研究
- ✅ `quickstart.md` - 快速開始
- ✅ `next-phase.md` - 未來規劃

---

**備註**: `.specify/` 目錄暫時保留，未來新功能可能使用。
