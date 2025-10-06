/**
 * useBeforeUnload Hook
 * 在用戶離開頁面前顯示確認提示
 */

import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

/**
 * 離開頁面前確認 Hook
 * @param when 是否啟用離開確認 (通常在有未儲存變更時為 true)
 * @param message 自訂提示訊息 (注意: 現代瀏覽器通常忽略此訊息，使用預設訊息)
 */
export function useBeforeUnload(when: boolean, message?: string): void {
  const messageRef = useRef(message);

  // 更新 message ref
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    if (!when) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // 標準做法: 設定 returnValue
      event.preventDefault();

      // 現代瀏覽器會忽略自訂訊息，顯示預設的確認對話框
      const confirmationMessage = messageRef.current || '您有未儲存的變更，確定要離開嗎？';
      event.returnValue = confirmationMessage;

      logger.debug('beforeunload triggered', { message: confirmationMessage }, 'useBeforeUnload');

      return confirmationMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    logger.debug('beforeunload listener added', { when }, 'useBeforeUnload');

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      logger.debug('beforeunload listener removed', {}, 'useBeforeUnload');
    };
  }, [when]);
}

export default useBeforeUnload;
