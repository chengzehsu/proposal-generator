/**
 * useOfflineStorage Hook
 * 本地儲存管理，支援 LocalStorage 持久化
 */

import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

/**
 * 本地儲存 Hook
 * @param key LocalStorage 鍵名
 * @param initialValue 初始值
 * @returns [storedValue, setValue, removeValue]
 */
export function useOfflineStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // 初始化狀態 - 從 LocalStorage 讀取或使用初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as T;
      }
      return initialValue;
    } catch (error) {
      logger.error('Error reading from localStorage', error as Error, 'useOfflineStorage');
      return initialValue;
    }
  });

  // 設定值並同步到 LocalStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // 支援函數式更新
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));

        logger.debug('LocalStorage updated', { key, value: valueToStore }, 'useOfflineStorage');
      } catch (error) {
        logger.error('Error writing to localStorage', error as Error, 'useOfflineStorage');
      }
    },
    [key, storedValue]
  );

  // 移除值
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);

      logger.debug('LocalStorage item removed', { key }, 'useOfflineStorage');
    } catch (error) {
      logger.error('Error removing from localStorage', error as Error, 'useOfflineStorage');
    }
  }, [key, initialValue]);

  // 監聽其他視窗的 storage 變更
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue) as T;
          setStoredValue(newValue);
        } catch (error) {
          logger.error('Error parsing storage event', error as Error, 'useOfflineStorage');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue, removeValue];
}

export default useOfflineStorage;
