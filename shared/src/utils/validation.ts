/**
 * 驗證工具函式
 */

import { TEXT_LIMITS, UPLOAD_LIMITS } from '../constants';

// 電子郵件驗證
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= TEXT_LIMITS.EMAIL.MAX;
};

// 台灣統一編號驗證
export const isValidTaxId = (taxId: string): boolean => {
  if (!/^\d{8}$/.test(taxId)) return false;
  
  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    const digit = taxId[i];
    const weight = weights[i];
    if (!digit || weight === undefined) continue;
    
    let product = parseInt(digit) * weight;
    sum += Math.floor(product / 10) + (product % 10);
  }
  
  return sum % 10 === 0;
};

// 台灣電話號碼驗證
export const isValidPhone = (phone: string): boolean => {
  // 支援市話、手機、國際格式
  const phoneRegex = /^(\+886[-\s]?)?(\d{2,3}[-\s]?)?\d{6,8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// 密碼強度驗證
export const isValidPassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('密碼長度至少需要8個字元');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密碼需包含至少一個大寫字母');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密碼需包含至少一個小寫字母');
  }
  
  if (!/\d/.test(password)) {
    errors.push('密碼需包含至少一個數字');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// URL 驗證
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// 文字長度驗證
export const validateTextLength = (
  text: string,
  fieldName: keyof typeof TEXT_LIMITS
): { isValid: boolean; error?: string } => {
  const limits = TEXT_LIMITS[fieldName];
  
  if ('LENGTH' in limits) {
    if (text.length !== limits.LENGTH) {
      return {
        isValid: false,
        error: `${fieldName} 必須為 ${limits.LENGTH} 個字元`,
      };
    }
  } else if ('MIN' in limits) {
    if (text.length < limits.MIN) {
      return {
        isValid: false,
        error: `${fieldName} 至少需要 ${limits.MIN} 個字元`,
      };
    }
    
    if (text.length > limits.MAX) {
      return {
        isValid: false,
        error: `${fieldName} 不能超過 ${limits.MAX} 個字元`,
      };
    }
  }
  
  return { isValid: true };
};

// 金額驗證 (台幣)
export const isValidAmount = (amount: number): boolean => {
  return amount >= 0 && amount <= 999999999999; // 9999億
};

// 日期範圍驗證
export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate <= endDate;
};

// 檔案類型驗證
export const isValidFileType = (mimeType: string): boolean => {
  return (UPLOAD_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
};

// 批次驗證
export const validateFields = <T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, (value: any) => { isValid: boolean; error?: string }>>
): { isValid: boolean; errors: Record<keyof T, string> } => {
  const errors: Record<keyof T, string> = {} as Record<keyof T, string>;
  
  for (const [field, validator] of Object.entries(rules) as Array<[keyof T, any]>) {
    const result = validator(data[field]);
    if (!result.isValid) {
      errors[field] = result.error || `${String(field)} 格式錯誤`;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};