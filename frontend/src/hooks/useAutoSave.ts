/**
 * useAutoSave Hook
 * 自動儲存功能，使用 debounce 減少 API 呼叫
 * 支援離線模式和本地備份
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';
import { useOfflineStorage } from './useOfflineStorage';
import { logger } from '@/utils/logger';

export enum SaveStatus {
  IDLE = 'idle',
  SAVING = 'saving',
  SAVED = 'saved',
  ERROR = 'error',
  OFFLINE = 'offline',
}

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  storageKey?: string; // LocalStorage 鍵名 (用於離線備份)
  enableOfflineBackup?: boolean; // 是否啟用離線備份
}

interface UseAutoSaveResult {
  status: SaveStatus;
  lastSaved: Date | null;
  error: Error | null;
  isOffline: boolean;
  save: () => Promise<void>;
  clearOfflineBackup: () => void;
}

/**
 * 自動儲存 Hook
 * @param options 選項
 * @returns 自動儲存狀態
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  onSuccess,
  onError,
  storageKey,
  enableOfflineBackup = true,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const [status, setStatus] = useState<SaveStatus>(SaveStatus.IDLE);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const debouncedData = useDebounce(data, delay);
  const isFirstRender = useRef<boolean>(true);
  const isSavingRef = useRef<boolean>(false);

  // 本地備份 (僅在啟用離線備份且提供 storageKey 時使用)
  const [, setOfflineBackup, clearOfflineBackup] = useOfflineStorage<T | null>(
    storageKey ?? 'auto_save_backup',
    null
  );

  // 監聽網路狀態
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      logger.info('Network status: online', {}, 'useAutoSave');
    };

    const handleOffline = () => {
      setIsOffline(true);
      setStatus(SaveStatus.OFFLINE);
      logger.warn('Network status: offline', {}, 'useAutoSave');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 手動儲存函數
  const save = useCallback(async () => {
    if (isSavingRef.current) {
      logger.debug('Save already in progress, skipping', {}, 'useAutoSave');
      return;
    }

    isSavingRef.current = true;

    try {
      // 如果離線，儲存到 LocalStorage
      if (isOffline) {
        if (enableOfflineBackup && storageKey) {
          setOfflineBackup(data);
          setStatus(SaveStatus.OFFLINE);
          setLastSaved(new Date());
          logger.info('Offline backup saved to localStorage', { storageKey }, 'useAutoSave');
        }
        return;
      }

      // 線上時儲存到伺服器
      setStatus(SaveStatus.SAVING);
      setError(null);

      await onSave(data);

      setStatus(SaveStatus.SAVED);
      setLastSaved(new Date());
      setError(null);

      logger.info('Auto save successful', {}, 'useAutoSave');

      // 成功後清除離線備份
      if (enableOfflineBackup && storageKey) {
        clearOfflineBackup();
      }

      if (onSuccess) {
        onSuccess();
      }

      // 3 秒後將狀態重置為 IDLE
      window.setTimeout(() => {
        setStatus(SaveStatus.IDLE);
      }, 3000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setStatus(SaveStatus.ERROR);
      setError(error);

      logger.error('Auto save failed', error, 'useAutoSave');

      // 失敗時備份到 LocalStorage
      if (enableOfflineBackup && storageKey) {
        setOfflineBackup(data);
        logger.info('Failed save backed up to localStorage', { storageKey }, 'useAutoSave');
      }

      if (onError) {
        onError(error);
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, onSuccess, onError, isOffline, enableOfflineBackup, storageKey, setOfflineBackup, clearOfflineBackup]);

  // 自動儲存效果
  useEffect(() => {
    // 跳過第一次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 如果禁用自動儲存，跳過
    if (!enabled) {
      return;
    }

    // 如果正在儲存，跳過
    if (isSavingRef.current) {
      return;
    }

    // 執行自動儲存
    save();
  }, [debouncedData, enabled, save]);

  // 網路恢復時自動同步
  useEffect(() => {
    if (!isOffline && enableOfflineBackup && storageKey) {
      // 網路恢復時，觸發一次儲存以同步本地備份
      const timeoutId = window.setTimeout(() => {
        if (!isSavingRef.current) {
          save();
        }
      }, 1000); // 延遲 1 秒確保網路穩定

      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [isOffline, enableOfflineBackup, storageKey, save]);

  // 頁面卸載時儲存
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === SaveStatus.SAVING) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [status]);

  return {
    status,
    lastSaved,
    error,
    isOffline,
    save,
    clearOfflineBackup,
  };
}

export default useAutoSave;
