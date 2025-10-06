/**
 * 標案狀態管理工具函數
 */

export enum ProposalStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled'
}

// 狀態標籤中文對照
export const statusLabels: Record<ProposalStatus, string> = {
  [ProposalStatus.DRAFT]: '草稿',
  [ProposalStatus.PENDING]: '待提交',
  [ProposalStatus.SUBMITTED]: '已提交',
  [ProposalStatus.WON]: '得標',
  [ProposalStatus.LOST]: '未得標',
  [ProposalStatus.CANCELLED]: '取消'
}

// 狀態對應的 Material-UI 顏色
export const statusColors: Record<ProposalStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  [ProposalStatus.DRAFT]: 'default',
  [ProposalStatus.PENDING]: 'info',
  [ProposalStatus.SUBMITTED]: 'warning',
  [ProposalStatus.WON]: 'success',
  [ProposalStatus.LOST]: 'error',
  [ProposalStatus.CANCELLED]: 'default'
}

// 狀態對應的顏色代碼（用於 Tailwind 或自訂樣式）
export const statusColorCodes: Record<ProposalStatus, string> = {
  [ProposalStatus.DRAFT]: '#9E9E9E',
  [ProposalStatus.PENDING]: '#2196F3',
  [ProposalStatus.SUBMITTED]: '#FF9800',
  [ProposalStatus.WON]: '#4CAF50',
  [ProposalStatus.LOST]: '#F44336',
  [ProposalStatus.CANCELLED]: '#757575'
}

// 狀態轉換規則：當前狀態 → 可轉換的狀態列表
const statusTransitions: Record<ProposalStatus, ProposalStatus[]> = {
  [ProposalStatus.DRAFT]: [ProposalStatus.PENDING, ProposalStatus.CANCELLED],
  [ProposalStatus.PENDING]: [ProposalStatus.SUBMITTED, ProposalStatus.DRAFT, ProposalStatus.CANCELLED],
  [ProposalStatus.SUBMITTED]: [ProposalStatus.WON, ProposalStatus.LOST, ProposalStatus.CANCELLED],
  [ProposalStatus.WON]: [ProposalStatus.CANCELLED],
  [ProposalStatus.LOST]: [ProposalStatus.CANCELLED],
  [ProposalStatus.CANCELLED]: []
}

/**
 * 取得當前狀態可轉換的所有合法狀態
 * @param currentStatus 當前狀態
 * @returns 可轉換的狀態陣列
 */
export const getValidStatusTransitions = (currentStatus: ProposalStatus): ProposalStatus[] => {
  return statusTransitions[currentStatus] || []
}

/**
 * 檢查狀態轉換是否合法
 * @param fromStatus 來源狀態
 * @param toStatus 目標狀態
 * @returns 是否可以轉換
 */
export const isValidStatusTransition = (fromStatus: ProposalStatus, toStatus: ProposalStatus): boolean => {
  const validTransitions = statusTransitions[fromStatus] || []
  return validTransitions.includes(toStatus)
}

/**
 * 取得狀態的中文標籤
 * @param status 狀態值
 * @returns 中文標籤
 */
export const getStatusLabel = (status: string): string => {
  return statusLabels[status as ProposalStatus] || status
}

/**
 * 取得狀態的顏色
 * @param status 狀態值
 * @returns Material-UI 顏色名稱
 */
export const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  return statusColors[status as ProposalStatus] || 'default'
}

/**
 * 取得狀態的顏色代碼
 * @param status 狀態值
 * @returns 十六進位顏色代碼
 */
export const getStatusColorCode = (status: string): string => {
  return statusColorCodes[status as ProposalStatus] || '#9E9E9E'
}

/**
 * 檢查狀態是否為最終狀態（不可再轉換）
 * @param status 狀態值
 * @returns 是否為最終狀態
 */
export const isFinalStatus = (status: ProposalStatus): boolean => {
  return getValidStatusTransitions(status).length === 0
}

/**
 * 取得所有狀態選項（用於下拉選單）
 * @returns 狀態選項陣列
 */
export const getAllStatusOptions = () => {
  return Object.values(ProposalStatus).map(status => ({
    value: status,
    label: statusLabels[status],
    color: statusColors[status]
  }))
}
