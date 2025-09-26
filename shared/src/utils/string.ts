/**
 * 字串工具函式
 */

// 截斷文字並加上省略號
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

// 移除 HTML 標籤
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

// 計算純文字字數（去除 HTML 標籤）
export const countWords = (text: string): number => {
  const plainText = stripHtml(text);
  // 中文字符和英文單字分別計算
  const chineseChars = (plainText.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = plainText
    .replace(/[\u4e00-\u9fff]/g, '')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
    
  return chineseChars + englishWords;
};

// 格式化檔案大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 生成隨機字串
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Slug 化 (URL 友善的字串)
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // 空格替換為連字號
    .replace(/[^\w\-]+/g, '')       // 移除非字母數字和連字號的字符
    .replace(/\-\-+/g, '-')         // 多個連字號替換為單一連字號
    .replace(/^-+/, '')             // 移除開頭的連字號
    .replace(/-+$/, '');            // 移除結尾的連字號
};

// 首字母大寫
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// 駝峰命名轉換
export const toCamelCase = (text: string): string => {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

// 蛇形命名轉換
export const toSnakeCase = (text: string): string => {
  return text
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};

// 高亮搜索關鍵字
export const highlightSearchText = (text: string, searchTerm: string): string => {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// 生成安全的檔名
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-z0-9\u4e00-\u9fff._-]/gi, '_')  // 允許中文、英數字、點、底線、連字號
    .replace(/_{2,}/g, '_')                        // 多個底線替換為單一底線
    .replace(/^_+|_+$/g, '');                      // 移除開頭結尾的底線
};

// 遮蔽敏感資訊
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  const maskLength = data.length - (visibleChars * 2);
  
  return start + '*'.repeat(maskLength) + end;
};

// 檢查是否為空字串或僅包含空白
export const isEmpty = (text: string | null | undefined): boolean => {
  return !text || text.trim().length === 0;
};

// 安全的 JSON 解析
export const safeJsonParse = <T = any>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
};