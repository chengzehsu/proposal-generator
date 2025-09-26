# 智能標書產生器系統資料模型設計

**Feature Branch**: `001-ai`  
**Created**: 2025-09-26  
**Status**: Draft  

本文档定義了智能標書產生器系統的完整資料模型，包括實體關係、欄位定義、驗證規則和狀態轉換。

---

## 核心實體概覽

```
Users (用戶系統)
  └── Companies (公司資料)
      ├── BasicInfo (基本資料)
      ├── Profiles (公司簡介版本)
      ├── TeamMembers (團隊成員)
      ├── Projects (實績案例)
      ├── Awards (獲獎紀錄)
      ├── Milestones (里程碑)
      ├── Capabilities (技術能力)
      └── FuturePlans (未來展望)

Templates (範本系統)
  ├── ProposalTemplates (標書範本)
  ├── TemplateSections (章節結構)
  ├── FormatSpecs (格式規範)
  └── AttachmentRequirements (附件需求)

Proposals (標書內容)
  ├── ProposalSections (章節內容)
  ├── ProposalHistory (版本歷史)
  └── ProposalSubmissions (提交記錄)
```

---

## 詳細實體定義

### 1. 用戶和權限系統

#### Users (用戶)
```typescript
interface User {
  id: string;                    // UUID primary key
  email: string;                 // 唯一登入信箱
  password_hash: string;         // bcrypt雜湊密碼
  name: string;                  // 使用者姓名
  role: UserRole;                // 角色權限
  company_id?: string;           // 所屬公司
  is_active: boolean;            // 帳戶狀態
  last_login?: Date;             // 最後登入時間
  created_at: Date;
  updated_at: Date;
}

enum UserRole {
  SUPER_ADMIN = "super_admin",   // 系統管理員
  ADMIN = "admin",               // 公司管理員
  EDITOR = "editor",             // 編輯者
  VIEWER = "viewer"              // 檢視者
}
```

**驗證規則**:
- email: 有效電子信箱格式，系統唯一
- password: 最少8字元，包含大小寫字母和數字
- name: 2-50字元
- 軟刪除機制 (is_active: false)

### 2. 公司資料管理

#### Companies (公司基本資料)
```typescript
interface Company {
  id: string;                    // UUID primary key
  company_name: string;          // 公司名稱
  tax_id: string;                // 統一編號
  capital?: number;              // 資本額 (元)
  established_date?: Date;       // 成立日期
  address: string;               // 公司地址
  phone: string;                 // 聯絡電話
  email: string;                 // 公司信箱
  website?: string;              // 公司網站
  created_at: Date;
  updated_at: Date;
  version: number;               // 樂觀鎖版本控制
}
```

**驗證規則**:
- company_name: 2-255字元，必填
- tax_id: 8位數字格式驗證，唯一
- capital: 正數，單位為元
- phone: 台灣電話格式驗證
- email: 有效信箱格式

#### CompanyProfiles (公司簡介)
```typescript
interface CompanyProfile {
  id: string;
  company_id: string;            // 外鍵關聯Companies
  version_name: string;          // 版本名稱 (如: 長版, 短版, 政府標案版)
  vision?: string;               // 企業願景
  mission?: string;              // 企業使命
  core_values?: string;          // 核心價值
  business_scope: string;        // 業務範圍
  description_full: string;      // 完整公司介紹
  description_medium?: string;   // 中等長度介紹
  description_short?: string;    // 簡短介紹
  is_active: boolean;            // 是否為現行版本
  created_at: Date;
  updated_at: Date;
}
```

#### TeamMembers (團隊成員)
```typescript
interface TeamMember {
  id: string;
  company_id: string;
  name: string;                  // 姓名
  title: string;                 // 職稱
  department?: string;           // 部門
  education?: string;            // 學歷背景
  experience?: string;           // 工作經歷
  expertise?: string;            // 專長領域
  photo_url?: string;            // 照片連結
  is_key_member: boolean;        // 是否為關鍵人員
  display_order: number;         // 顯示順序
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

#### Projects (實績案例)
```typescript
interface Project {
  id: string;
  company_id: string;
  project_name: string;          // 專案名稱
  client_name?: string;          // 客戶名稱
  start_date?: Date;             // 開始日期
  end_date?: Date;               // 結束日期
  amount?: number;               // 專案金額
  scale?: string;                // 專案規模描述
  description: string;           // 執行內容描述
  achievements?: string;         // 專案成果
  tags: string[];                // 專案標籤/分類
  is_public: boolean;            // 是否可公開揭露
  attachments?: Attachment[];    // 相關文件/圖片
  created_at: Date;
  updated_at: Date;
}

interface Attachment {
  filename: string;
  url: string;
  file_size: number;
  mime_type: string;
}
```

#### Awards (獲獎紀錄)
```typescript
interface Award {
  id: string;
  company_id: string;
  award_name: string;            // 獎項名稱
  issuer: string;                // 頒發單位
  award_date?: Date;             // 獲獎日期
  description?: string;          // 獎項說明
  award_type: AwardType;         // 獎項類型
  amount?: number;               // 獎勵金額 (補助/獎金)
  certificate_url?: string;      // 證書文件連結
  created_at: Date;
  updated_at: Date;
}

enum AwardType {
  GOVERNMENT_GRANT = "government_grant",  // 政府補助
  COMPETITION = "competition",            // 競賽獎項
  CERTIFICATION = "certification",        // 認證資格
  RECOGNITION = "recognition"             // 表揚獎項
}
```

### 3. 標書範本系統

#### ProposalTemplates (標書範本)
```typescript
interface ProposalTemplate {
  id: string;
  template_name: string;         // 範本名稱
  template_type: TemplateType;   // 範本類型
  description?: string;          // 範本說明
  is_system_template: boolean;   // 是否為系統預設範本
  created_by?: string;           // 建立者 (User ID)
  created_at: Date;
  updated_at: Date;
}

enum TemplateType {
  GOVERNMENT_GRANT = "government_grant",    // 政府補助
  ENTERPRISE_BID = "enterprise_bid",        // 企業標案
  AWARD_APPLICATION = "award_application",  // 獎項申請
  CUSTOM = "custom"                         // 自訂範本
}
```

#### TemplateSections (範本章節)
```typescript
interface TemplateSection {
  id: string;
  template_id: string;           // 外鍵關聯ProposalTemplates
  section_name: string;          // 章節名稱
  section_order: number;         // 章節順序
  is_required: boolean;          // 是否必要
  min_words?: number;            // 最少字數
  max_words?: number;            // 最多字數
  content_hint?: string;         // 內容提示說明
  data_types: DataSourceType[];  // 對應的資料來源類型
  score_weight?: number;         // 評分權重 (0-100)
  created_at: Date;
  updated_at: Date;
}

enum DataSourceType {
  COMPANY_BASIC = "company_basic",
  COMPANY_PROFILE = "company_profile", 
  TEAM_MEMBERS = "team_members",
  PROJECTS = "projects",
  AWARDS = "awards",
  CAPABILITIES = "capabilities",
  CUSTOM_INPUT = "custom_input"
}
```

### 4. 標書內容管理

#### Proposals (標書)
```typescript
interface Proposal {
  id: string;
  proposal_name: string;         // 標書名稱
  template_id: string;           // 使用的範本
  company_id: string;            // 所屬公司
  status: ProposalStatus;        // 狀態
  created_by: string;            // 建立者
  last_edited_by: string;        // 最後編輯者
  word_count: number;            // 總字數
  generated_with_ai: boolean;    // 是否使用AI生成
  ai_generation_prompt?: string; // AI生成的提示詞
  created_at: Date;
  updated_at: Date;
}

enum ProposalStatus {
  DRAFT = "draft",               // 草稿
  IN_REVIEW = "in_review",       // 審核中
  COMPLETED = "completed",       // 已完成
  SUBMITTED = "submitted"        // 已提交
}
```

#### ProposalSections (標書章節內容)
```typescript
interface ProposalSection {
  id: string;
  proposal_id: string;           // 外鍵關聯Proposals
  section_id: string;            // 外鍵關聯TemplateSections
  content: string;               // 章節內容 (富文本)
  word_count: number;            // 字數統計
  is_ai_generated: boolean;      // 是否AI生成
  ai_confidence_score?: number;  // AI生成信心分數
  section_order: number;         // 章節順序
  created_at: Date;
  updated_at: Date;
}
```

### 5. 版本控制和審計

#### AuditLogs (審計日誌)
```typescript
interface AuditLog {
  id: string;
  table_name: string;            // 受影響的資料表
  record_id: string;             // 受影響的記錄ID
  action: AuditAction;           // 操作類型
  old_values?: Record<string, any>; // 變更前數值
  new_values?: Record<string, any>; // 變更後數值
  changed_by: string;            // 變更者
  changed_at: Date;              // 變更時間
  ip_address?: string;           // 來源IP
  user_agent?: string;           // 瀏覽器資訊
}

enum AuditAction {
  CREATE = "create",
  UPDATE = "update", 
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout"
}
```

---

## 關係設計

### 主要外鍵關聯
```sql
-- 用戶與公司關聯 (多對一)
Users.company_id → Companies.id

-- 公司資料關聯 (一對多)
Companies.id → CompanyProfiles.company_id
Companies.id → TeamMembers.company_id  
Companies.id → Projects.company_id
Companies.id → Awards.company_id

-- 範本系統關聯
ProposalTemplates.id → TemplateSections.template_id
ProposalTemplates.id → Proposals.template_id

-- 標書內容關聯
Proposals.id → ProposalSections.proposal_id
TemplateSections.id → ProposalSections.section_id
```

### 索引策略
```sql
-- 效能關鍵索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_companies_tax_id ON companies(tax_id);
CREATE INDEX idx_proposals_status_created ON proposals(status, created_at);
CREATE INDEX idx_projects_company_tags ON projects(company_id, tags);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id, changed_at);
```

---

## 狀態轉換

### Proposal Status 狀態流
```
DRAFT → IN_REVIEW → COMPLETED → SUBMITTED
  ↑         ↓           ↑
  └─────────────────────┘
  (可退回修改)
```

### 資料版本控制
- 使用樂觀鎖 (version欄位) 防止併發衝突
- 關鍵資料變更自動建立審計日誌
- 支援時間點查詢 (Point-in-Time Recovery)

---

## 資料完整性約束

### 業務規則約束
1. **公司唯一性**: 統一編號在系統中必須唯一
2. **範本完整性**: 標書必須基於有效的範本建立
3. **權限控制**: 用戶只能存取自己公司的資料
4. **版本一致性**: 公司簡介同時只能有一個active版本
5. **審計完整性**: 所有資料異動都必須記錄審計日誌

### 資料驗證規則
- 統一編號: 8位數字格式
- 電話號碼: 台灣格式驗證  
- 電子信箱: RFC 5322標準
- 金額欄位: 非負數值
- 日期範圍: 合理的日期區間檢查