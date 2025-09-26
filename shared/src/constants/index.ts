/**
 * 共用常數定義
 */

// API 相關常數
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRIES: 3,
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  },
} as const;

// 檔案上傳限制
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  MAX_FILES_PER_UPLOAD: 5,
} as const;

// 文字限制
export const TEXT_LIMITS = {
  COMPANY_NAME: { MIN: 2, MAX: 255 },
  TAX_ID: { LENGTH: 8 },
  USER_NAME: { MIN: 2, MAX: 50 },
  EMAIL: { MAX: 255 },
  PHONE: { MIN: 8, MAX: 20 },
  DESCRIPTION: { MIN: 10, MAX: 5000 },
  PROPOSAL_NAME: { MIN: 2, MAX: 255 },
  SECTION_CONTENT: { MIN: 1, MAX: 50000 },
} as const;

// 分頁預設值
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// 標書相關常數
export const PROPOSAL_DEFAULTS = {
  AI_GENERATION_TIMEOUT: 60000, // 1 minute
  EXPORT_TIMEOUT: 120000, // 2 minutes
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  MAX_WORD_COUNT: 50000,
  MIN_CONFIDENCE_SCORE: 0.7,
} as const;

// 系統角色權限
export const ROLE_PERMISSIONS = {
  super_admin: [
    'users:read',
    'users:write',
    'users:delete',
    'companies:read',
    'companies:write',
    'templates:read',
    'templates:write',
    'templates:delete',
    'proposals:read',
    'proposals:write',
    'proposals:delete',
    'audit:read',
  ],
  admin: [
    'users:read',
    'users:write',
    'companies:read',
    'companies:write',
    'templates:read',
    'templates:write',
    'proposals:read',
    'proposals:write',
  ],
  editor: [
    'companies:read',
    'companies:write',
    'templates:read',
    'proposals:read',
    'proposals:write',
  ],
  viewer: [
    'companies:read',
    'templates:read',
    'proposals:read',
  ],
} as const;

// 日期格式
export const DATE_FORMATS = {
  DISPLAY: 'yyyy-MM-dd',
  DISPLAY_WITH_TIME: 'yyyy-MM-dd HH:mm:ss',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',
  FILE_TIMESTAMP: 'yyyyMMdd_HHmmss',
} as const;

// 錯誤代碼
export const ERROR_CODES = {
  // 認證相關
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // 驗證相關
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_LENGTH_EXCEEDED: 'VALIDATION_LENGTH_EXCEEDED',
  
  // 業務邏輯相關
  COMPANY_TAX_ID_EXISTS: 'COMPANY_TAX_ID_EXISTS',
  TEMPLATE_SECTIONS_REQUIRED: 'TEMPLATE_SECTIONS_REQUIRED',
  PROPOSAL_GENERATION_FAILED: 'PROPOSAL_GENERATION_FAILED',
  EXPORT_FORMAT_UNSUPPORTED: 'EXPORT_FORMAT_UNSUPPORTED',
  
  // 系統相關
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
} as const;

// 預設範本類型說明
export const TEMPLATE_TYPE_DESCRIPTIONS = {
  government_grant: '政府補助申請',
  enterprise_bid: '企業標案投標',
  award_application: '獎項申請',
  custom: '自訂範本',
} as const;

// AI 相關常數
export const AI_CONFIG = {
  MAX_PROMPT_LENGTH: 2000,
  MAX_GENERATION_ATTEMPTS: 3,
  CONFIDENCE_THRESHOLD: 0.7,
  TIMEOUT_MS: 60000,
  DEFAULT_MODEL: 'gemini-2.5-pro',
} as const;