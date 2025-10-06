/**
 * useApiMutation Hook
 * 封裝 API 變更操作（POST、PUT、DELETE），提供樂觀更新和錯誤處理
 */

import { useCallback, useRef, useState } from 'react';
import { logger } from '@/utils/logger';

interface UseApiMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
  optimisticUpdate?: (variables: TVariables) => TData;
}

interface UseApiMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | void>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
}

/**
 * API 變更操作 Hook
 * @param mutationFn 變更函數
 * @param options 選項
 * @returns 變更結果
 */
export function useApiMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseApiMutationOptions<TData, TVariables> = {}
): UseApiMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled, optimisticUpdate } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const previousDataRef = useRef<TData | null>(null);

  // 重置狀態
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    previousDataRef.current = null;
  }, []);

  // 執行變更（不返回 Promise）
  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | void> => {
      setIsLoading(true);
      setError(null);

      // 樂觀更新
      if (optimisticUpdate) {
        previousDataRef.current = data;
        const optimisticData = optimisticUpdate(variables);
        setData(optimisticData);
        logger.debug('Optimistic update applied', { variables }, 'useApiMutation');
      }

      try {
        const startTime = Date.now();
        const result = await mutationFn(variables);
        const duration = Date.now() - startTime;

        if (!isMountedRef.current) return;

        setData(result);
        setError(null);
        previousDataRef.current = null;

        logger.api('Mutation', 'mutate', 200, duration);

        if (onSuccess) {
          onSuccess(result, variables);
        }

        if (onSettled) {
          onSettled(result, null, variables);
        }

        return result;
      } catch (err) {
        if (!isMountedRef.current) return;

        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('API Mutation failed', error, 'useApiMutation');

        // 回滾樂觀更新
        if (optimisticUpdate && previousDataRef.current !== null) {
          setData(previousDataRef.current);
          logger.debug('Optimistic update rolled back', {}, 'useApiMutation');
        }

        setError(error);

        if (onError) {
          onError(error, variables);
        }

        if (onSettled) {
          onSettled(null, error, variables);
        }

        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [mutationFn, optimisticUpdate, onSuccess, onError, onSettled, data]
  );

  // 執行變更（返回 Promise）
  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      const result = await mutate(variables);
      if (!result) {
        throw new Error('Mutation failed');
      }
      return result;
    },
    [mutate]
  );

  // 清理
  useCallback(() => {
    isMountedRef.current = false;
  }, []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    reset,
  };
}

export default useApiMutation;
