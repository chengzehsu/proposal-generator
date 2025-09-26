/**
 * 日期工具函式
 */

import { DATE_FORMATS } from '../constants';

// 格式化日期顯示
export const formatDate = (date: Date | string, format: keyof typeof DATE_FORMATS = 'DISPLAY'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  const ms = String(dateObj.getMilliseconds()).padStart(3, '0');
  
  switch (format) {
    case 'DISPLAY':
      return `${year}-${month}-${day}`;
      
    case 'DISPLAY_WITH_TIME':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      
    case 'ISO':
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}Z`;
      
    case 'FILE_TIMESTAMP':
      return `${year}${month}${day}_${hours}${minutes}${seconds}`;
      
    default:
      return `${year}-${month}-${day}`;
  }
};

// 相對時間顯示 (如: 2小時前)
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) {
    return `${years}年前`;
  } else if (months > 0) {
    return `${months}個月前`;
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小時前`;
  } else if (minutes > 0) {
    return `${minutes}分鐘前`;
  } else {
    return '剛剛';
  }
};

// 檢查日期是否在範圍內
export const isDateInRange = (
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean => {
  const checkDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return checkDate >= start && checkDate <= end;
};

// 計算日期差異
export const dateDiffInDays = (date1: Date | string, date2: Date | string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 獲取月份的開始和結束日期
export const getMonthRange = (year: number, month: number): { start: Date; end: Date } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  
  return { start, end };
};

// 獲取年份的開始和結束日期
export const getYearRange = (year: number): { start: Date; end: Date } => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  
  return { start, end };
};

// 檢查是否為有效日期
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

// 添加日期
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};