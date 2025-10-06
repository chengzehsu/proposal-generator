/**
 * AI提示工程模組
 * 提供專業化的提示詞模板和生成邏輯
 */

export interface CompanyContext {
  company_name?: string;
  description?: string;
  industry?: string;
  established_date?: Date;
  capital?: number;
  team_members?: Array<{
    name: string;
    title: string;
    department?: string;
    expertise?: string;
  }>;
  projects?: Array<{
    project_name: string;
    client_name?: string;
    description?: string;
    achievements?: string;
    tags?: string[];
  }>;
  awards?: Array<{
    award_name: string;
    issuer?: string;
    award_date?: Date;
    description?: string;
  }>;
}

export interface PromptContext {
  company?: CompanyContext;
  sectionType?: string;
  additionalContext?: Record<string, any>;
  tone?: 'professional' | 'confident' | 'formal' | 'persuasive';
  length?: 'short' | 'medium' | 'long';
  language?: 'zh-TW' | 'en' | 'ja' | 'ko';
}

/**
 * 核心系統提示詞模板
 */
export const SYSTEM_PROMPTS = {
  base: `你是一位資深的商業提案寫作專家，擁有豐富的標書撰寫經驗。你的任務是協助用戶創建專業、有說服力的標書內容。

請遵循以下原則：
- 使用正式、專業的商業語調
- 內容要具體、有邏輯性
- 突出公司優勢和競爭力
- 符合台灣商業慣例和法規要求
- 避免誇大不實的描述`,

  sectionSpecific: {
    '公司介紹': `專注於撰寫公司介紹內容，重點包括：
- 公司發展歷程和里程碑
- 核心業務和專業領域
- 組織架構和人力資源
- 企業文化和經營理念
- 市場地位和競爭優勢`,

    '專案背景': `專注於分析和描述專案背景，包括：
- 專案需求分析
- 市場環境評估
- 技術趨勢和挑戰
- 解決方案的必要性
- 預期效益和影響`,

    '技術方案': `專注於技術方案設計，涵蓋：
- 技術架構和系統設計
- 實施方法論和最佳實務
- 技術創新和差異化
- 風險評估和應對策略
- 品質保證和測試計劃`,

    '時程規劃': `專注於專案時程安排，包含：
- 專案階段劃分和里程碑
- 資源配置和人力安排
- 關鍵路徑分析
- 風險緩衝和應變計劃
- 交付時程和驗收標準`,

    '預算報價': `專注於成本分析和報價，涵蓋：
- 成本結構分析
- 價格競爭力評估
- 價值主張和投資報酬
- 付款條件和風險分攤
- 成本控制和變更管理`,

    '團隊介紹': `專注於團隊組成和能力展示：
- 團隊結構和角色分工
- 核心成員專業背景
- 相關經驗和成功案例
- 教育訓練和認證資格
- 團隊協作和管理機制`,

    '實績案例': `專注於成功案例展示：
- 專案規模和複雜度
- 解決方案和技術亮點
- 實施過程和挑戰克服
- 交付成果和客戶評價
- 經驗學習和能力提升`
  }
};

/**
 * 內容改善提示詞模板
 */
export const IMPROVEMENT_PROMPTS = {
  '語調優化': `請將以下內容的語調調整得更加專業、正式，適合商業提案環境。
要求：
- 使用商業術語和專業表達
- 語氣要自信但不傲慢
- 避免口語化表達
- 增強說服力和可信度`,

  '內容擴充': `請擴充以下內容，增加更多細節、論據和說明。
要求：
- 增加具體的數據和例證
- 補充技術細節和實施方法
- 添加風險分析和應對策略
- 強化價值主張和競爭優勢`,

  '結構調整': `請重新組織以下內容的結構，使其更清晰、有邏輯。
要求：
- 建立清楚的層次結構
- 使用適當的標題和分段
- 確保內容流暢銜接
- 突出重點和關鍵訊息`,

  '專業度提升': `請提升以下內容的專業度，加入更多專業術語和觀點。
要求：
- 使用行業標準術語
- 引用最佳實務和標準
- 展現深度專業知識
- 增加技術可信度`,

  '客製化調整': `請根據特定需求調整以下內容。
要求：
- 針對目標客戶群體
- 突出相關優勢和特色
- 調整重點和強調面向
- 確保內容相關性和適切性`
};

/**
 * 翻譯提示詞模板
 */
export const TRANSLATION_PROMPTS = {
  base: `你是一位專業的商業文件翻譯專家，請將以下繁體中文內容翻譯為目標語言。

翻譯要求：
- 保持商業文件的正式語調
- 確保專業術語準確性
- 維持原文的邏輯結構
- 符合目標語言的商業慣例`,

  languages: {
    'English': '翻譯為英文，使用國際商業英語標準',
    'Japanese': '翻譯為日文，使用敬語和商業用語',
    'Korean': '翻譯為韓文，使用正式商業韓語',
    'Simplified Chinese': '翻譯為簡體中文，使用大陸商業慣用語'
  }
};

/**
 * 生成完整的系統提示詞
 */
export function buildSystemPrompt(context: PromptContext): string {
  let prompt = SYSTEM_PROMPTS.base;

  // 添加章節特定提示
  if (context.sectionType && SYSTEM_PROMPTS.sectionSpecific[context.sectionType as keyof typeof SYSTEM_PROMPTS.sectionSpecific]) {
    prompt += `\n\n${  SYSTEM_PROMPTS.sectionSpecific[context.sectionType as keyof typeof SYSTEM_PROMPTS.sectionSpecific]}`;
  }

  // 添加語調要求
  if (context.tone) {
    const toneInstructions = {
      'professional': '使用專業、客觀的語調',
      'confident': '展現自信和能力的語調',
      'formal': '採用正式、莊重的語調',
      'persuasive': '使用具說服力和吸引力的語調'
    };
    prompt += `\n\n語調要求：${  toneInstructions[context.tone]}`;
  }

  // 添加長度要求
  if (context.length) {
    const lengthInstructions = {
      'short': '內容簡潔，重點明確（建議200-500字）',
      'medium': '內容適中，詳略得當（建議500-1200字）',
      'long': '內容詳細，論述完整（建議1200字以上）'
    };
    prompt += `\n\n長度要求：${  lengthInstructions[context.length]}`;
  }

  return prompt;
}

/**
 * 生成上下文資訊
 */
export function _buildContextPrompt(context: PromptContext): string {
  let contextPrompt = '';

  if (context.company) {
    contextPrompt += '## 公司資訊\n';
    
    if (context.company.company_name) {
      contextPrompt += `**公司名稱：** ${context.company.company_name}\n`;
    }
    
    if (context.company.description) {
      contextPrompt += `**公司描述：** ${context.company.description}\n`;
    }
    
    if (context.company.industry) {
      contextPrompt += `**所屬行業：** ${context.company.industry}\n`;
    }
    
    if (context.company.established_date) {
      contextPrompt += `**成立時間：** ${context.company.established_date.getFullYear()}年\n`;
    }
    
    if (context.company.capital) {
      contextPrompt += `**資本額：** ${(context.company.capital / 10000).toLocaleString()}萬元\n`;
    }

    // 團隊成員資訊
    if (context.company.team_members && context.company.team_members.length > 0) {
      contextPrompt += '\n**核心團隊：**\n';
      context.company.team_members.forEach(member => {
        contextPrompt += `- ${member.name}（${member.title}）`;
        if (member.expertise) {
          contextPrompt += `：${member.expertise}`;
        }
        contextPrompt += '\n';
      });
    }

    // 專案經驗
    if (context.company.projects && context.company.projects.length > 0) {
      contextPrompt += '\n**重要專案經驗：**\n';
      context.company.projects.forEach(project => {
        contextPrompt += `- ${project.project_name}`;
        if (project.client_name) {
          contextPrompt += `（${project.client_name}）`;
        }
        if (project.description) {
          contextPrompt += `：${project.description}`;
        }
        contextPrompt += '\n';
      });
    }

    // 獲獎記錄
    if (context.company.awards && context.company.awards.length > 0) {
      contextPrompt += '\n**獲獎記錄：**\n';
      context.company.awards.forEach(award => {
        contextPrompt += `- ${award.award_name}`;
        if (award.issuer) {
          contextPrompt += `（${award.issuer}）`;
        }
        contextPrompt += '\n';
      });
    }

    contextPrompt += '\n';
  }

  // 額外上下文資訊
  if (context.additionalContext) {
    contextPrompt += '## 額外資訊\n';
    for (const [key, value] of Object.entries(context.additionalContext)) {
      if (value !== null && value !== undefined) {
        contextPrompt += `**${key}：** ${JSON.stringify(value)}\n`;
      }
    }
  }

  return contextPrompt;
}

/**
 * 生成改善提示詞
 */
export function buildImprovementPrompt(
  originalContent: string,
  improvementType: keyof typeof IMPROVEMENT_PROMPTS,
  specificRequirements?: string,
  targetLength?: string
): string {
  let prompt = IMPROVEMENT_PROMPTS[improvementType];

  if (specificRequirements) {
    prompt += `\n\n特殊要求：${specificRequirements}`;
  }

  if (targetLength && targetLength !== '保持原樣') {
    const lengthInstructions = {
      '更簡潔': '請縮短內容長度，保留核心重點',
      '更詳細': '請增加內容長度，補充更多細節'
    };
    prompt += `\n\n長度調整：${lengthInstructions[targetLength as keyof typeof lengthInstructions]}`;
  }

  prompt += `\n\n原始內容：\n${originalContent}`;

  return prompt;
}

/**
 * 生成翻譯提示詞
 */
export function buildTranslationPrompt(
  content: string,
  targetLanguage: string,
  contextInfo?: string
): string {
  let prompt = TRANSLATION_PROMPTS.base;

  if (TRANSLATION_PROMPTS.languages[targetLanguage as keyof typeof TRANSLATION_PROMPTS.languages]) {
    prompt += `\n\n${  TRANSLATION_PROMPTS.languages[targetLanguage as keyof typeof TRANSLATION_PROMPTS.languages]}`;
  }

  if (contextInfo) {
    prompt += `\n\n背景資訊：${contextInfo}`;
  }

  prompt += `\n\n原文內容：\n${content}`;

  return prompt;
}

/**
 * RFP需求提取提示詞
 */
export function buildExtractionPrompt(
  rfpContent: string,
  extractSections: string[]
): string {
  const sectionDescriptions = {
    '基本需求': '提取基本功能需求、服務範圍和業務目標',
    '技術規格': '提取技術標準、系統規格和性能要求',
    '時程要求': '提取專案時程、里程碑和交付期限',
    '預算限制': '提取預算範圍、成本限制和付款條件',
    '評選標準': '提取評選條件、評分標準和加分項目',
    '其他條件': '提取特殊條件、限制事項和注意事項'
  };

  let prompt = `請從以下RFP（需求徵詢書）文件中，提取並整理以下類別的資訊：

提取內容：\n`;

  extractSections.forEach(section => {
    if (sectionDescriptions[section as keyof typeof sectionDescriptions]) {
      prompt += `- ${section}：${sectionDescriptions[section as keyof typeof sectionDescriptions]}\n`;
    }
  });

  prompt += `
請按照以下格式整理輸出：

# RFP需求分析

`;

  extractSections.forEach(section => {
    prompt += `## ${section}
（此處列出相關內容）

`;
  });

  prompt += `RFP文件內容：
${rfpContent}`;

  return prompt;
}

/**
 * 驗證和清理用戶輸入
 */
export function sanitizeUserInput(input: string): string {
  // 移除潛在的注入攻擊內容
  return input
    .replace(/[<>]/g, '') // 移除HTML標籤
    .replace(/javascript:/gi, '') // 移除JavaScript協議
    .replace(/on\w+=/gi, '') // 移除事件處理器
    .trim();
}

/**
 * 提示詞品質評估
 */
export function evaluatePromptQuality(prompt: string): {
  score: number;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  let score = 100;

  // 檢查長度
  if (prompt.length < 50) {
    score -= 20;
    suggestions.push('提示詞過短，建議增加更多上下文資訊');
  }

  if (prompt.length > 4000) {
    score -= 10;
    suggestions.push('提示詞過長，可能影響AI理解，建議精簡');
  }

  // 檢查結構
  if (!prompt.includes('##') && !prompt.includes('**')) {
    score -= 15;
    suggestions.push('建議增加標題和重點標記以改善結構');
  }

  // 檢查具體性
  if (!/\d/.test(prompt)) {
    score -= 10;
    suggestions.push('建議增加具體的數據或量化資訊');
  }

  return { score: Math.max(0, score), suggestions };
}