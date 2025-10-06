/**
 * formatTime 工具函數測試
 */

import {
  formatRelativeTime,
  formatDateTime,
  formatTime,
  formatDate,
} from '@/utils/formatTime';

describe('formatTime utilities', () => {
  describe('formatRelativeTime', () => {
    test('應該顯示「剛剛」當時間小於 1 分鐘', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      expect(formatRelativeTime(thirtySecondsAgo)).toBe('剛剛');
    });

    test('應該顯示分鐘數當時間小於 1 小時', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 分鐘前');
    });

    test('應該顯示小時數當時間小於 1 天', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      expect(formatRelativeTime(threeHoursAgo)).toBe('3 小時前');
    });

    test('應該顯示天數當時間小於 7 天', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      expect(formatRelativeTime(twoDaysAgo)).toBe('2 天前');
    });

    test('應該顯示完整日期當時間超過 7 天', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const result = formatRelativeTime(tenDaysAgo);
      // 結果應該包含日期格式
      expect(result).toMatch(/\d{4}/); // 年份
    });

    test('應該處理未來時間', () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 1000);

      expect(formatRelativeTime(futureTime)).toBe('剛剛');
    });
  });

  describe('formatDateTime', () => {
    test('應該格式化完整日期時間', () => {
      const date = new Date('2024-10-05T14:30:45');
      const result = formatDateTime(date);

      expect(result).toContain('2024');
      expect(result).toContain('10');
      expect(result).toContain('05');
      expect(result).toContain('14');
      expect(result).toContain('30');
    });
  });

  describe('formatTime', () => {
    test('應該格式化時間 (HH:mm)', () => {
      const date = new Date('2024-10-05T14:30:45');
      const result = formatTime(date);

      expect(result).toContain('14');
      expect(result).toContain('30');
    });
  });

  describe('formatDate', () => {
    test('應該格式化日期 (YYYY-MM-DD)', () => {
      const date = new Date('2024-10-05T14:30:45');
      const result = formatDate(date);

      expect(result).toContain('2024');
      expect(result).toContain('10');
      expect(result).toContain('05');
    });
  });
});
