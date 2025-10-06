/**
 * AI 功能相關型別定義
 */

/**
 * AI 內容生成請求
 */
export interface AIGenerateRequest {
  prompt: string;
  context?: Record<string, unknown>;
  max_tokens?: number;
  temperature?: number;
  section_type?: SectionType;
}

/**
 * AI 內容生成回應
 */
export interface AIGenerateResponse {
  content: string;
  metadata: {
    section_type?: SectionType;
    tokens_used: number;
    generation_time: string;
  };
}

/**
 * AI 內容改善請求
 */
export interface AIImproveRequest {
  content: string;
  improvement_type: ImprovementType;
  specific_requirements?: string;
  target_length?: TargetLength;
}

/**
 * AI 內容改善回應
 */
export interface AIImproveResponse {
  improved_content: string;
  original_length: number;
  improved_length: number;
  changes_summary: string;
  metadata: {
    improvement_type: ImprovementType;
    tokens_used: number;
    generation_time: string;
  };
}

/**
 * AI 翻譯請求
 */
export interface AITranslateRequest {
  content: string;
  target_language: TargetLanguage;
  context?: string;
}

/**
 * AI 翻譯回應
 */
export interface AITranslateResponse {
  translated_content: string;
  source_language: string;
  target_language: TargetLanguage;
  metadata: {
    tokens_used: number;
    generation_time: string;
  };
}

/**
 * AI 需求提取請求
 */
export interface AIExtractRequirementsRequest {
  rfp_content: string;
  extract_sections: ExtractSection[];
}

/**
 * AI 需求提取回應
 */
export interface AIExtractRequirementsResponse {
  requirements: {
    [key in ExtractSection]?: string;
  };
  metadata: {
    total_sections: number;
    tokens_used: number;
    generation_time: string;
  };
}

/**
 * 章節類型
 */
export type SectionType =
  | '公司介紹'
  | '專案背景'
  | '技術方案'
  | '時程規劃'
  | '預算報價'
  | '團隊介紹'
  | '其他';

/**
 * 改善類型
 */
export type ImprovementType =
  | '語調優化'
  | '內容擴充'
  | '結構調整'
  | '專業度提升'
  | '客製化調整';

/**
 * 目標長度
 */
export type TargetLength = '更簡潔' | '保持原樣' | '更詳細';

/**
 * 目標語言
 */
export type TargetLanguage = '英文' | '日文' | '韓文' | '簡體中文';

/**
 * 提取區段
 */
export type ExtractSection =
  | '基本需求'
  | '技術規格'
  | '時程要求'
  | '預算限制'
  | '評選標準'
  | '其他條件';

/**
 * Gemini API 請求參數
 */
export interface GeminiAPIRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * Gemini API 回應
 */
export interface GeminiAPIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}
