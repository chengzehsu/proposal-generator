/**
 * 標案狀態轉換驗證中間件 (FR-026)
 * 確保狀態轉換的合法性
 */

export const PROPOSAL_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  WON: 'WON',
  LOST: 'LOST',
  CANCELLED: 'CANCELLED'
} as const;

export type ProposalStatusType = typeof PROPOSAL_STATUS[keyof typeof PROPOSAL_STATUS];

/**
 * 合法的狀態轉換規則
 * - DRAFT → PENDING → SUBMITTED → WON/LOST
 * - 任何狀態 → CANCELLED
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  [PROPOSAL_STATUS.DRAFT]: [
    PROPOSAL_STATUS.PENDING,
    PROPOSAL_STATUS.CANCELLED
  ],
  [PROPOSAL_STATUS.PENDING]: [
    PROPOSAL_STATUS.DRAFT,
    PROPOSAL_STATUS.SUBMITTED,
    PROPOSAL_STATUS.CANCELLED
  ],
  [PROPOSAL_STATUS.SUBMITTED]: [
    PROPOSAL_STATUS.PENDING,
    PROPOSAL_STATUS.WON,
    PROPOSAL_STATUS.LOST,
    PROPOSAL_STATUS.CANCELLED
  ],
  [PROPOSAL_STATUS.WON]: [
    PROPOSAL_STATUS.CANCELLED
  ],
  [PROPOSAL_STATUS.LOST]: [
    PROPOSAL_STATUS.CANCELLED
  ],
  [PROPOSAL_STATUS.CANCELLED]: []
};

/**
 * 驗證狀態轉換是否合法
 * @param fromStatus 原狀態
 * @param toStatus 目標狀態
 * @returns 是否為合法轉換
 */
export function isValidStatusTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  // 相同狀態不需轉換
  if (fromStatus === toStatus) {
    return false;
  }

  // 檢查目標狀態是否有效
  if (!Object.values(PROPOSAL_STATUS).includes(toStatus as ProposalStatusType)) {
    return false;
  }

  // 檢查轉換是否在允許的轉換列表中
  const allowedTransitions = VALID_TRANSITIONS[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
}

/**
 * 取得狀態轉換錯誤訊息
 * @param fromStatus 原狀態
 * @param toStatus 目標狀態
 * @returns 錯誤訊息
 */
export function getStatusTransitionError(
  fromStatus: string,
  toStatus: string
): string {
  if (fromStatus === toStatus) {
    return '狀態未變更';
  }

  if (!Object.values(PROPOSAL_STATUS).includes(toStatus as ProposalStatusType)) {
    return `無效的狀態: ${toStatus}`;
  }

  const allowedTransitions = VALID_TRANSITIONS[fromStatus] || [];
  if (allowedTransitions.length === 0) {
    return `狀態 ${fromStatus} 無法轉換至其他狀態`;
  }

  return `不允許從 ${fromStatus} 轉換至 ${toStatus}。允許的轉換: ${allowedTransitions.join(', ')}`;
}

/**
 * 取得狀態的中文顯示名稱
 */
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  [PROPOSAL_STATUS.DRAFT]: '草稿',
  [PROPOSAL_STATUS.PENDING]: '待提交',
  [PROPOSAL_STATUS.SUBMITTED]: '已提交',
  [PROPOSAL_STATUS.WON]: '得標',
  [PROPOSAL_STATUS.LOST]: '未得標',
  [PROPOSAL_STATUS.CANCELLED]: '取消'
};
