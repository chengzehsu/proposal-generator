/**
 * 時間格式化工具函數
 */

/**
 * 格式化相對時間 (例如: 3 分鐘前, 2 小時前)
 * @param date 要格式化的日期
 * @returns 相對時間字串
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const targetTime = date.getTime();
  const seconds = Math.floor((now - targetTime) / 1000);

  // 未來時間
  if (seconds < 0) {
    return '剛剛';
  }

  // 小於 1 分鐘
  if (seconds < 60) {
    return '剛剛';
  }

  // 小於 1 小時
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} 分鐘前`;
  }

  // 小於 1 天
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} 小時前`;
  }

  // 小於 7 天
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} 天前`;
  }

  // 超過 7 天，顯示完整日期
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化時間戳為易讀格式
 * @param date 要格式化的日期
 * @returns 格式化的時間字串 (例如: 2024-10-05 14:30:45)
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * 格式化時間為簡短格式
 * @param date 要格式化的日期
 * @returns 簡短時間字串 (例如: 14:30)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 格式化日期為簡短格式
 * @param date 要格式化的日期
 * @returns 簡短日期字串 (例如: 2024-10-05)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default {
  formatRelativeTime,
  formatDateTime,
  formatTime,
  formatDate,
};
