/**
 * useDebounce Hook
 * 延遲值的更新，常用於搜尋輸入框或自動儲存功能
 */

import { useEffect, useState } from 'react';

/**
 * 延遲更新值
 * @param value 要延遲的值
 * @param delay 延遲時間（毫秒）
 * @returns 延遲後的值
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 設定延遲計時器
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函數：如果 value 或 delay 改變，清除上一個計時器
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
