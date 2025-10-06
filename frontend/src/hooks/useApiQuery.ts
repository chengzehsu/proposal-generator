/**
 * useApiQuery Hook
 * 封裝 API 查詢邏輯，提供統一的載入/錯誤狀態管理
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../utils/logger';

interface UseApiQueryOptions<T> {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  cacheTime?: number;
}

interface UseApiQueryResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
}

// 簡單的查詢快取
const queryCache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * API 查詢 Hook
 * @param queryKey 查詢的唯一鍵值
 * @param queryFn 查詢函數
 * @param options 選項
 * @returns 查詢結果
 */
export function useApiQuery<T>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const {
    enabled = true,
    retry = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
    cacheTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const cacheKey = Array.isArray(queryKey) ? queryKey.join('-') : queryKey;

  // 執行查詢
  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    // 檢查快取
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data as T);
      setError(null);
      logger.debug('Using cached data', { queryKey: cacheKey }, 'useApiQuery');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const result = await queryFn();
      const duration = Date.now() - startTime;

      if (!isMountedRef.current) return;

      setData(result);
      setError(null);
      retryCountRef.current = 0;

      // 更新快取
      queryCache.set(cacheKey, { data: result, timestamp: Date.now() });

      logger.api('Query', cacheKey, 200, duration);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('API Query failed', error, 'useApiQuery');

      // 重試邏輯
      if (retryCountRef.current < retry) {
        retryCountRef.current++;
        logger.info(`Retrying query (${retryCountRef.current}/${retry})`, { queryKey: cacheKey }, 'useApiQuery');

        setTimeout(() => {
          executeQuery();
        }, retryDelay);
      } else {
        setError(error);
        if (onError) {
          onError(error);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, queryFn, cacheKey, cacheTime, retry, retryDelay, onSuccess, onError]);

  // 手動重新查詢
  const refetch = useCallback(async () => {
    // 清除快取
    queryCache.delete(cacheKey);
    retryCountRef.current = 0;
    await executeQuery();
  }, [executeQuery, cacheKey]);

  // 自動查詢
  useEffect(() => {
    isMountedRef.current = true;
    executeQuery();

    return () => {
      isMountedRef.current = false;
    };
  }, [executeQuery]);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    refetch,
  };
}

export default useApiQuery;
