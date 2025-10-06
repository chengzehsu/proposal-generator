/**
 * 應用程式配置常數
 */

/**
 * API 端點配置
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * API 端點路徑
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    PROFILE: '/api/v1/auth/profile',
    REFRESH: '/api/v1/auth/refresh',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    VERIFY_RESET_TOKEN: '/api/v1/auth/verify-reset-token',
    INVITE_USER: '/api/v1/auth/invite-user',
    ACCEPT_INVITE: '/api/v1/auth/accept-invite',
  },
  // Companies
  COMPANIES: {
    BASE: '/api/v1/companies',
    BY_ID: (id: string) => `/api/v1/companies/${id}`,
  },
  // Team Members
  TEAM_MEMBERS: {
    BASE: '/api/v1/team-members',
    BY_ID: (id: string) => `/api/v1/team-members/${id}`,
  },
  // Projects
  PROJECTS: {
    BASE: '/api/v1/projects',
    BY_ID: (id: string) => `/api/v1/projects/${id}`,
  },
  // Awards
  AWARDS: {
    BASE: '/api/v1/awards',
    BY_ID: (id: string) => `/api/v1/awards/${id}`,
  },
  // Templates
  TEMPLATES: {
    BASE: '/api/v1/templates',
    BY_ID: (id: string) => `/api/v1/templates/${id}`,
  },
  // Sections
  SECTIONS: {
    BASE: '/api/v1/sections',
    BY_ID: (id: string) => `/api/v1/sections/${id}`,
  },
  // Proposals
  PROPOSALS: {
    BASE: '/api/v1/proposals',
    BY_ID: (id: string) => `/api/v1/proposals/${id}`,
    GENERATE: '/api/v1/proposals/generate',
  },
  // AI
  AI: {
    GENERATE: '/api/v1/ai/generate',
    IMPROVE: '/api/v1/ai/improve',
    TRANSLATE: '/api/v1/ai/translate',
    EXTRACT_REQUIREMENTS: '/api/v1/ai/extract-requirements',
    USAGE: '/api/v1/ai/usage',
  },
  // Exports
  EXPORTS: {
    PDF: '/api/v1/exports/pdf',
    DOCX: '/api/v1/exports/docx',
    ODT: '/api/v1/exports/odt',
  },
} as const;

/**
 * 功能開關
 */
export const FEATURE_FLAGS = {
  ENABLE_AI_GENERATION: true,
  ENABLE_MULTI_LANGUAGE: true,
  ENABLE_EXPORT_PDF: true,
  ENABLE_EXPORT_DOCX: true,
  ENABLE_EXPORT_ODT: true,
  ENABLE_ANALYTICS: false,
  ENABLE_NOTIFICATIONS: false,
} as const;

/**
 * 應用程式常數
 */
export const APP_CONSTANTS = {
  APP_NAME: '智能標案產生器',
  APP_VERSION: '1.0.0',
  DEFAULT_LOCALE: 'zh-TW',
  SUPPORTED_LOCALES: ['zh-TW', 'en-US'] as const,

  // 分頁設定
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,

  // 文件限制
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['pdf', 'docx', 'doc', 'odt', 'txt'] as const,

  // 編輯器設定
  EDITOR_AUTO_SAVE_DELAY: 2000, // 2 seconds
  EDITOR_MAX_CONTENT_LENGTH: 100000, // 100k characters

  // AI 設定
  AI_MAX_TOKENS: 4000,
  AI_DEFAULT_TEMPERATURE: 0.7,
  AI_MAX_PROMPT_LENGTH: 2000,

  // 快取設定
  CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes

  // 本地儲存鍵值
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_INFO: 'user_info',
    THEME: 'theme',
    LANGUAGE: 'language',
    RECENT_PROPOSALS: 'recent_proposals',
  } as const,
} as const;

/**
 * UI 常數
 */
export const UI_CONSTANTS = {
  // 過渡動畫時長
  TRANSITION_DURATION: {
    SHORT: 150,
    MEDIUM: 300,
    LONG: 500,
  },

  // 通知顯示時長
  NOTIFICATION_DURATION: {
    SUCCESS: 3000,
    ERROR: 5000,
    WARNING: 4000,
    INFO: 3000,
  },

  // Z-index 層級
  Z_INDEX: {
    DROPDOWN: 1000,
    MODAL: 1050,
    TOOLTIP: 1100,
    NOTIFICATION: 1200,
  },

  // 斷點
  BREAKPOINTS: {
    XS: 0,
    SM: 576,
    MD: 768,
    LG: 992,
    XL: 1200,
    XXL: 1400,
  },
} as const;

/**
 * 路由路徑
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  COMPANIES: '/companies',
  COMPANY_DETAIL: (id: string) => `/companies/${id}`,
  TEMPLATES: '/templates',
  TEMPLATE_EDITOR: (id: string) => `/templates/${id}/edit`,
  PROPOSALS: '/proposals',
  PROPOSAL_EDITOR: (id: string) => `/proposals/${id}/edit`,
  SETTINGS: '/settings',
  PROFILE: '/profile',
  NOT_FOUND: '/404',
} as const;

/**
 * 錯誤訊息
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '網路連線錯誤，請檢查您的網路連線',
  UNAUTHORIZED: '您沒有權限執行此操作',
  SESSION_EXPIRED: '登入已過期，請重新登入',
  SERVER_ERROR: '伺服器錯誤，請稍後再試',
  VALIDATION_ERROR: '輸入資料格式錯誤',
  NOT_FOUND: '找不到請求的資源',
  TIMEOUT: '請求超時，請稍後再試',
} as const;

/**
 * 成功訊息
 */
export const SUCCESS_MESSAGES = {
  SAVED: '儲存成功',
  CREATED: '建立成功',
  UPDATED: '更新成功',
  DELETED: '刪除成功',
  COPIED: '複製成功',
  EXPORTED: '匯出成功',
} as const;

/**
 * 正則表達式
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]{10}$/,
  TAX_ID: /^\d{8}$/,
  URL: /^https?:\/\/.+/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;
