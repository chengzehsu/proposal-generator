/**
 * 匯出功能相關型別定義
 */

/**
 * 匯出格式
 */
export type ExportFormat = 'pdf' | 'docx' | 'odt';

/**
 * 匯出請求基礎介面
 */
export interface BaseExportRequest {
  content: string;
  title?: string;
  metadata?: ExportMetadata;
}

/**
 * PDF 匯出請求
 */
export interface PDFExportRequest extends BaseExportRequest {
  format: 'pdf';
  options?: PDFExportOptions;
}

/**
 * DOCX 匯出請求
 */
export interface DOCXExportRequest extends BaseExportRequest {
  format: 'docx';
  options?: DOCXExportOptions;
}

/**
 * ODT 匯出請求
 */
export interface ODTExportRequest extends BaseExportRequest {
  format: 'odt';
  options?: ODTExportOptions;
}

/**
 * 匯出請求聯合型別
 */
export type ExportRequest =
  | PDFExportRequest
  | DOCXExportRequest
  | ODTExportRequest;

/**
 * 匯出回應
 */
export interface ExportResponse {
  message: string;
  download_url: string;
  filename: string;
  file_size: number;
  format: ExportFormat;
  expires_at?: string;
}

/**
 * 匯出元資料
 */
export interface ExportMetadata {
  author?: string;
  company?: string;
  created_at?: string;
  version?: string;
  custom_fields?: Record<string, string>;
}

/**
 * PDF 匯出選項
 */
export interface PDFExportOptions {
  page_size?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header?: string;
  footer?: string;
  page_numbers?: boolean;
  watermark?: string;
}

/**
 * DOCX 匯出選項
 */
export interface DOCXExportOptions {
  page_size?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  font_family?: string;
  font_size?: number;
  line_spacing?: number;
  include_toc?: boolean;
}

/**
 * ODT 匯出選項
 */
export interface ODTExportOptions {
  page_size?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  font_family?: string;
  font_size?: number;
}

/**
 * 匯出狀態
 */
export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 匯出任務
 */
export interface ExportTask {
  id: string;
  user_id: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  download_url?: string;
  error?: string;
}
