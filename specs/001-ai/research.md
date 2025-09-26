# 智能標書產生器系統技術研究報告

**Feature Branch**: `001-ai`  
**Created**: 2025-09-26  
**Status**: Complete  

本研究報告針對智能標書產生器系統的四個核心技術方案進行深入分析，提供推薦解決方案、選擇理由、替代方案比較和實作最佳實踐。

---

## 1. Gemini 2.5 API整合

### 推薦解決方案
- **主要SDK**: `@google/generative-ai` (官方Node.js SDK)
- **認證方式**: 環境變數存儲API Key + OAuth 2.0 (生產環境)
- **錯誤處理**: 指數退避算法 (Exponential Backoff) + Circuit Breaker 模式
- **速率限制**: 客戶端速率限制器 + 請求佇列管理
- **快取策略**: Redis快取 + 內容雜湊去重

### 選擇理由和優點
1. **官方支持**: Google官方維護的SDK，提供最新功能和安全更新
2. **TypeScript原生支持**: 完整型別定義，減少開發錯誤
3. **彈性定價**: 免費層5 RPM，付費層可達60 RPM
4. **豐富的內容生成能力**: 支援長文本生成、結構化輸出、多模態輸入

### 考慮過的替代方案
- **OpenAI GPT-4**: 成本較高，中文支援較弱
- **Claude 3.5**: API可用性有限，定價不透明
- **本地LLM方案**: 部署複雜度高，效能不穩定

### 實作注意事項和最佳實踐

#### 認證安全
```javascript
// 推薦的認證方式
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 生產環境額外安全措施
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-pro",
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
  ]
});
```

#### 速率限制實作
```javascript
class GeminiRateLimiter {
  constructor() {
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.requestInterval = 12000; // 12秒間隔 (5 RPM)
  }

  async makeRequest(prompt) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.requestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    return await this.executeRequest(prompt);
  }
}
```

#### 錯誤處理與重試機制
```javascript
async function retryWithBackoff(operation, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

---

## 2. TipTap編輯器與shadcn/ui整合

### 推薦解決方案
- **編輯器核心**: TipTap v2 + React綁定
- **UI組件**: shadcn/ui官方Editor組件 + Minimal TipTap擴展
- **樣式方案**: Tailwind CSS + shadcn/ui設計tokens
- **TypeScript支援**: 完整型別定義 + 自定義擴展型別

### 選擇理由和優點
1. **官方整合**: shadcn/ui現已包含官方TipTap組件，維護品質有保障
2. **設計一致性**: 完美融入shadcn/ui設計系統，無需額外樣式調整
3. **功能完整性**: 支援富文本編輯、表格、圖片、協作編輯等完整功能
4. **擴展性**: 豐富的插件生態系統，支援自定義命令和擴展

### 考慮過的替代方案
- **Quill.js**: 樣式定制複雜，與shadcn/ui整合困難
- **Draft.js**: Facebook已停止維護，社區支持不足
- **Slate.js**: 學習曲線陡峭，開發成本高
- **CKEditor**: 商業授權成本高，客製化限制多

### 實作注意事項和最佳實踐

#### 組件安裝與設置
```bash
# 安裝官方shadcn/ui編輯器組件
npx shadcn@latest add editor

# 或使用社群維護的Minimal TipTap
npx shadcn@latest add https://raw.githubusercontent.com/Aslam97/shadcn-minimal-tiptap/main/registry/block-registry.json
```

#### 基礎配置
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

const ProposalEditor = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p>標書內容...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  return <EditorContent editor={editor} />;
};
```

#### 自定義工具列整合shadcn/ui
```typescript
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';

const EditorToolbar = ({ editor }: { editor: Editor }) => {
  return (
    <div className="border border-input bg-transparent rounded-md p-1 flex flex-wrap items-center gap-1">
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      
      <Separator orientation="vertical" className="h-6" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  );
};
```

#### 字數統計與限制
```typescript
const useWordCount = (editor: Editor) => {
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (editor) {
      const updateWordCount = () => {
        const text = editor.getText();
        const words = text.split(/\s+/).filter(word => word.length > 0);
        setWordCount(words.length);
      };

      editor.on('update', updateWordCount);
      updateWordCount();

      return () => {
        editor.off('update', updateWordCount);
      };
    }
  }, [editor]);

  return wordCount;
};
```

---

## 3. PDF/Word/ODT文件生成

### 推薦解決方案
- **PDF生成**: Puppeteer (主要) + PDFKit (輔助)
- **Word文件**: docx.js (建議) + Officegen (備用)
- **ODT文件**: node-libreoffice (轉換) + 自定義XML生成
- **模板引擎**: Handlebars.js + HTML/CSS樣式

### 選擇理由和優點

#### PDF生成 - Puppeteer優先
1. **高保真度**: 完美還原HTML/CSS樣式，支援複雜布局
2. **現代標準支援**: 支援CSS Grid、Flexbox、現代字體等
3. **動態內容**: 可處理JavaScript生成的動態內容
4. **調試友善**: 可視化調試，所見即所得

#### Word文件 - docx.js
1. **純JavaScript**: 無需額外依賴，性能優異
2. **功能完整**: 支援樣式、表格、圖片、頁首頁尾等
3. **模板支援**: 支援從模板文件修改內容
4. **跨平台**: 瀏覽器和Node.js環境通用

### 考慮過的替代方案

#### PDF生成替代方案
- **PDFKit**: 適合程式化生成，但複雜布局困難
- **jsPDF**: 瀏覽器端生成，功能有限
- **Playwright**: 功能類似Puppeteer，但生態系統較小

#### Office文件替代方案
- **Officegen**: 較舊的方案，功能有限
- **LibreOffice Headless**: 服務器依賴重，部署複雜
- **Mammoth.js**: 主要用於轉換，生成功能弱

### 實作注意事項和最佳實踐

#### PDF生成實作
```typescript
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';

class PDFGenerator {
  private browser: Browser | null = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none'
      ]
    });
  }

  async generateProposalPDF(templatePath: string, data: any): Promise<Buffer> {
    if (!this.browser) await this.initialize();

    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateContent);
    const html = template(data);

    const page = await this.browser!.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // 設定PDF選項
    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div class="text-xs text-gray-500 w-full text-center">標書文件</div>',
      footerTemplate: '<div class="text-xs text-gray-500 w-full text-center">第 <span class="pageNumber"></span> 頁 / 共 <span class="totalPages"></span> 頁</div>'
    };

    const pdfBuffer = await page.pdf(pdfOptions);
    await page.close();

    return pdfBuffer;
  }
}
```

#### Word文件生成實作
```typescript
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType } from 'docx';

class WordDocumentGenerator {
  async generateProposalDoc(proposalData: ProposalData): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 標題
          new Paragraph({
            children: [
              new TextRun({
                text: proposalData.title,
                bold: true,
                size: 32,
                font: 'Microsoft YaHei'
              })
            ],
            alignment: 'center',
            spacing: { after: 300 }
          }),

          // 公司資訊表格
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "公司名稱" })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: proposalData.companyName })],
                    width: { size: 75, type: WidthType.PERCENTAGE }
                  })
                ]
              })
            ]
          })
        ]
      }]
    });

    return await Packer.toBuffer(doc);
  }
}
```

#### 統一文件生成介面
```typescript
interface DocumentGenerator {
  generatePDF(templateId: string, data: any): Promise<Buffer>;
  generateWord(templateId: string, data: any): Promise<Buffer>;
  generateODT(templateId: string, data: any): Promise<Buffer>;
}

class ProposalDocumentService implements DocumentGenerator {
  private pdfGenerator = new PDFGenerator();
  private wordGenerator = new WordDocumentGenerator();

  async generateDocument(format: 'pdf' | 'word' | 'odt', templateId: string, data: any): Promise<Buffer> {
    switch (format) {
      case 'pdf':
        return this.generatePDF(templateId, data);
      case 'word':
        return this.generateWord(templateId, data);
      case 'odt':
        return this.generateODT(templateId, data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}
```

---

## 4. PostgreSQL版本控制和審計追蹤

### 推薦解決方案
- **版本控制模式**: Temporal Tables + 觸發器機制
- **審計追蹤**: 專用審計表 + 結構化日誌
- **變更追蹤**: Row-level觸發器 + JSONB變更記錄
- **查詢優化**: 時間範圍索引 + 分區表策略

### 選擇理由和優點
1. **雲端兼容性**: 無需C擴展，適用於AWS RDS、Azure、GCP等託管服務
2. **性能平衡**: 觸發器機制對寫入性能影響可控，查詢性能優異
3. **數據完整性**: 審計記錄不可篡改，支援完整的變更歷史追蹤
4. **靈活查詢**: 支援時間點查詢、變更追蹤、回滾操作

### 考慮過的替代方案
- **pgMemento擴展**: 功能強大但雲端支援有限
- **Application-level審計**: 開發複雜度高，容易遺漏
- **WAL-based追蹤**: 配置複雜，性能開銷大
- **全局版本表**: 維護困難，查詢性能差

### 實作注意事項和最佳實踐

#### 資料庫架構設計
```sql
-- 主表範例 (公司資料)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    contact_info JSONB,
    
    -- 版本控制欄位
    version_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    -- 軟刪除
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

-- 歷史版本表
CREATE TABLE companies_history (
    id UUID,
    version_number INTEGER,
    name VARCHAR(255),
    registration_number VARCHAR(50),
    address TEXT,
    contact_info JSONB,
    
    -- 版本追蹤
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    updated_by UUID,
    
    -- 變更資訊
    change_type VARCHAR(10), -- INSERT, UPDATE, DELETE
    changed_fields JSONB,
    change_reason TEXT,
    
    PRIMARY KEY (id, version_number)
);

-- 審計日誌表
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID NOT NULL,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_id BIGINT DEFAULT txid_current()
);
```

#### 觸發器實作
```sql
-- 通用審計觸發器函數
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_values JSONB := '{}';
    new_values JSONB := '{}';
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    operation VARCHAR(10);
BEGIN
    -- 設定操作類型
    IF TG_OP = 'DELETE' THEN
        old_values := to_jsonb(OLD);
        operation := 'DELETE';
    ELSIF TG_OP = 'UPDATE' THEN
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
        operation := 'UPDATE';
        
        -- 找出變更的欄位
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(new_values)
        WHERE value != COALESCE((old_values->key), 'null');
        
    ELSIF TG_OP = 'INSERT' THEN
        new_values := to_jsonb(NEW);
        operation := 'INSERT';
    END IF;

    -- 插入審計記錄
    INSERT INTO audit_log (
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        changed_fields,
        user_id,
        session_id
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        operation,
        old_values,
        new_values,
        changed_fields,
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by),
        current_setting('app.session_id', true)::UUID
    );

    -- 版本控制處理
    IF TG_OP = 'UPDATE' AND array_length(changed_fields, 1) > 0 THEN
        -- 保存舊版本到歷史表
        INSERT INTO companies_history (
            id, version_number, name, registration_number, address, contact_info,
            valid_from, valid_to, created_by, updated_by,
            change_type, changed_fields
        )
        SELECT 
            OLD.id, OLD.version_number, OLD.name, OLD.registration_number, 
            OLD.address, OLD.contact_info,
            OLD.updated_at, NEW.updated_at, OLD.created_by, OLD.updated_by,
            'UPDATE', to_jsonb(changed_fields);
            
        -- 更新版本號
        NEW.version_number := OLD.version_number + 1;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 為表建立觸發器
CREATE TRIGGER companies_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

#### 查詢輔助函數
```sql
-- 查詢特定時間點的資料狀態
CREATE OR REPLACE FUNCTION get_company_at_time(
    company_id UUID,
    target_time TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF companies AS $$
BEGIN
    -- 先查詢當前表
    IF target_time >= (SELECT created_at FROM companies WHERE id = company_id) THEN
        RETURN QUERY
        SELECT * FROM companies 
        WHERE id = company_id AND updated_at <= target_time;
    ELSE
        -- 查詢歷史表
        RETURN QUERY
        SELECT 
            id, name, registration_number, address, contact_info,
            version_number, valid_from as created_at, valid_to as updated_at,
            created_by, updated_by, FALSE as is_deleted, 
            NULL::TIMESTAMP as deleted_at, NULL::UUID as deleted_by
        FROM companies_history
        WHERE id = company_id 
          AND valid_from <= target_time 
          AND (valid_to > target_time OR valid_to IS NULL)
        ORDER BY version_number DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 獲取資料變更歷史
CREATE OR REPLACE FUNCTION get_company_change_history(
    company_id UUID,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    version INTEGER,
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by UUID,
    change_type VARCHAR(10),
    changed_fields JSONB,
    old_values JSONB,
    new_values JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.version_number::INTEGER,
        a.timestamp,
        a.user_id,
        a.operation,
        a.changed_fields::JSONB,
        a.old_values,
        a.new_values
    FROM audit_log a
    WHERE a.table_name = 'companies' 
      AND a.record_id = company_id
    ORDER BY a.timestamp DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

#### 性能優化索引
```sql
-- 審計表索引
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_transaction ON audit_log(transaction_id);

-- 歷史表索引  
CREATE INDEX idx_companies_history_time_range ON companies_history(id, valid_from, valid_to);
CREATE INDEX idx_companies_history_version ON companies_history(id, version_number);

-- 主表索引
CREATE INDEX idx_companies_updated_at ON companies(updated_at);
CREATE INDEX idx_companies_version ON companies(id, version_number);
```

#### Node.js集成範例
```typescript
class CompanyVersionService {
  async updateCompany(companyId: string, updateData: Partial<Company>, userId: string) {
    return await this.db.transaction(async (trx) => {
      // 設置session變數供觸發器使用
      await trx.raw('SET app.session_id = ?', [generateSessionId()]);
      
      // 執行更新
      const updated = await trx('companies')
        .where({ id: companyId })
        .update({
          ...updateData,
          updated_by: userId,
          updated_at: new Date()
        })
        .returning('*');

      return updated[0];
    });
  }

  async getCompanyHistory(companyId: string, limit = 50) {
    return await this.db
      .select('*')
      .from(this.db.raw('get_company_change_history(?, ?)', [companyId, limit]));
  }

  async getCompanyAtTime(companyId: string, targetTime: Date) {
    return await this.db
      .select('*')
      .from(this.db.raw('get_company_at_time(?, ?)', [companyId, targetTime]));
  }
}
```

---

## 總結

本研究為智能標書產生器系統提供了完整的技術方案，涵蓋AI整合、富文本編輯、文件生成和資料庫設計四個核心領域。所有推薦方案都經過詳細的技術評估，考慮了雲端部署、性能要求、維護成本和擴展性等因素。

### 關鍵技術棧總覽
- **AI服務**: Gemini 2.5 API + 官方Node.js SDK
- **富文本編輯**: TipTap + shadcn/ui官方組件
- **文件生成**: Puppeteer (PDF) + docx.js (Word)
- **資料庫**: PostgreSQL + 觸發器式版本控制

### 後續開發建議
1. 優先實作核心功能的MVP版本
2. 建立完整的測試覆蓋率
3. 設計彈性的配置系統支援多種部署環境
4. 實施監控和日誌系統確保生產環境穩定性

這些技術方案為系統提供了堅實的技術基礎，支援從原型開發到生產環境的完整生命週期。