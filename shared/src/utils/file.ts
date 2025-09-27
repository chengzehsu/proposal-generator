/**
 * 檔案工具函式
 */

import { UPLOAD_LIMITS } from '../constants';

// 檢查檔案大小
export const isFileSizeValid = (fileSize: number): boolean => {
  return fileSize <= UPLOAD_LIMITS.MAX_FILE_SIZE;
};

// 檢查檔案類型
export const isFileTypeAllowed = (mimeType: string): boolean => {
  return (UPLOAD_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
};

// 獲取檔案擴展名
export const getFileExtension = (fileName: string): string => {
  return fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
};

// 從 MIME 類型獲取檔案擴展名
export const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.oasis.opendocument.text': 'odt',
    'text/plain': 'txt',
    'application/json': 'json',
  };
  
  return mimeMap[mimeType] || '';
};

// 驗證檔案
export const validateFile = (file: File): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!isFileSizeValid(file.size)) {
    errors.push(`檔案大小不能超過 ${Math.floor(UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024)}MB`);
  }
  
  if (!isFileTypeAllowed(file.type)) {
    errors.push('不支援的檔案格式');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// 批次驗證多個檔案
export const validateFiles = (files: FileList): {
  isValid: boolean;
  errors: string[];
  validFiles: File[];
  invalidFiles: Array<{ file: File; errors: string[] }>;
} => {
  const errors: string[] = [];
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; errors: string[] }> = [];
  
  if (files.length > UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD) {
    errors.push(`一次最多只能上傳 ${UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD} 個檔案`);
  }
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    
    const validation = validateFile(file);
    
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, errors: validation.errors });
    }
  }
  
  return {
    isValid: errors.length === 0 && invalidFiles.length === 0,
    errors,
    validFiles,
    invalidFiles,
  };
};

// 檔案轉換為 Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error: ProgressEvent<FileReader>) => reject(new Error('檔案讀取失敗'));
  });
};

// Base64 轉換為 Blob
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const base64Data = base64.split(',')[1] || base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// 產生檔案下載
export const downloadFile = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
};

// 從 URL 下載檔案
export const downloadFromUrl = async (url: string, fileName?: string): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const urlParts = url.split('/');
    const finalFileName = fileName || urlParts[urlParts.length - 1] || 'download';
    
    downloadFile(blob, finalFileName);
  } catch (error: unknown) {
    throw new Error('檔案下載失敗');
  }
};

// 壓縮圖片
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // 計算新的尺寸
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 繪製圖片到 canvas
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('圖片壓縮失敗'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('無法載入圖片'));
    img.src = URL.createObjectURL(file);
  });
};