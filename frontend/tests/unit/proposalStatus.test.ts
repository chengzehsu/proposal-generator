/**
 * 標案狀態管理工具函數測試
 */

import {
  ProposalStatus,
  getValidStatusTransitions,
  isValidStatusTransition,
  getStatusLabel,
  getStatusColor,
  isFinalStatus,
  statusLabels,
  statusColors
} from '../../src/utils/proposalStatus'

describe('proposalStatus utility functions', () => {
  describe('getValidStatusTransitions', () => {
    test('DRAFT 可以轉換為 PENDING 或 CANCELLED', () => {
      const transitions = getValidStatusTransitions(ProposalStatus.DRAFT)
      expect(transitions).toContain(ProposalStatus.PENDING)
      expect(transitions).toContain(ProposalStatus.CANCELLED)
      expect(transitions).toHaveLength(2)
    })

    test('PENDING 可以轉換為 SUBMITTED, DRAFT 或 CANCELLED', () => {
      const transitions = getValidStatusTransitions(ProposalStatus.PENDING)
      expect(transitions).toContain(ProposalStatus.SUBMITTED)
      expect(transitions).toContain(ProposalStatus.DRAFT)
      expect(transitions).toContain(ProposalStatus.CANCELLED)
      expect(transitions).toHaveLength(3)
    })

    test('SUBMITTED 可以轉換為 WON, LOST 或 CANCELLED', () => {
      const transitions = getValidStatusTransitions(ProposalStatus.SUBMITTED)
      expect(transitions).toContain(ProposalStatus.WON)
      expect(transitions).toContain(ProposalStatus.LOST)
      expect(transitions).toContain(ProposalStatus.CANCELLED)
      expect(transitions).toHaveLength(3)
    })

    test('WON 只能轉換為 CANCELLED', () => {
      const transitions = getValidStatusTransitions(ProposalStatus.WON)
      expect(transitions).toContain(ProposalStatus.CANCELLED)
      expect(transitions).toHaveLength(1)
    })

    test('LOST 只能轉換為 CANCELLED', () => {
      const transitions = getValidStatusTransitions(ProposalStatus.LOST)
      expect(transitions).toContain(ProposalStatus.CANCELLED)
      expect(transitions).toHaveLength(1)
    })

    test('CANCELLED 是最終狀態，無法再轉換', () => {
      const transitions = getValidStatusTransitions(ProposalStatus.CANCELLED)
      expect(transitions).toHaveLength(0)
    })
  })

  describe('isValidStatusTransition', () => {
    test('DRAFT → PENDING 是合法的', () => {
      expect(isValidStatusTransition(ProposalStatus.DRAFT, ProposalStatus.PENDING)).toBe(true)
    })

    test('DRAFT → SUBMITTED 是非法的', () => {
      expect(isValidStatusTransition(ProposalStatus.DRAFT, ProposalStatus.SUBMITTED)).toBe(false)
    })

    test('SUBMITTED → WON 是合法的', () => {
      expect(isValidStatusTransition(ProposalStatus.SUBMITTED, ProposalStatus.WON)).toBe(true)
    })

    test('CANCELLED → DRAFT 是非法的（最終狀態無法轉換）', () => {
      expect(isValidStatusTransition(ProposalStatus.CANCELLED, ProposalStatus.DRAFT)).toBe(false)
    })

    test('WON → LOST 是非法的', () => {
      expect(isValidStatusTransition(ProposalStatus.WON, ProposalStatus.LOST)).toBe(false)
    })
  })

  describe('getStatusLabel', () => {
    test('返回正確的中文標籤', () => {
      expect(getStatusLabel(ProposalStatus.DRAFT)).toBe('草稿')
      expect(getStatusLabel(ProposalStatus.PENDING)).toBe('待提交')
      expect(getStatusLabel(ProposalStatus.SUBMITTED)).toBe('已提交')
      expect(getStatusLabel(ProposalStatus.WON)).toBe('得標')
      expect(getStatusLabel(ProposalStatus.LOST)).toBe('未得標')
      expect(getStatusLabel(ProposalStatus.CANCELLED)).toBe('取消')
    })

    test('未知狀態返回原始值', () => {
      expect(getStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS')
    })
  })

  describe('getStatusColor', () => {
    test('返回正確的顏色', () => {
      expect(getStatusColor(ProposalStatus.DRAFT)).toBe('default')
      expect(getStatusColor(ProposalStatus.PENDING)).toBe('info')
      expect(getStatusColor(ProposalStatus.SUBMITTED)).toBe('warning')
      expect(getStatusColor(ProposalStatus.WON)).toBe('success')
      expect(getStatusColor(ProposalStatus.LOST)).toBe('error')
      expect(getStatusColor(ProposalStatus.CANCELLED)).toBe('default')
    })

    test('未知狀態返回 default', () => {
      expect(getStatusColor('UNKNOWN_STATUS')).toBe('default')
    })
  })

  describe('isFinalStatus', () => {
    test('CANCELLED 是最終狀態', () => {
      expect(isFinalStatus(ProposalStatus.CANCELLED)).toBe(true)
    })

    test('DRAFT 不是最終狀態', () => {
      expect(isFinalStatus(ProposalStatus.DRAFT)).toBe(false)
    })

    test('WON 不是最終狀態（可以轉為 CANCELLED）', () => {
      expect(isFinalStatus(ProposalStatus.WON)).toBe(false)
    })

    test('SUBMITTED 不是最終狀態', () => {
      expect(isFinalStatus(ProposalStatus.SUBMITTED)).toBe(false)
    })
  })

  describe('status constants', () => {
    test('statusLabels 包含所有狀態', () => {
      const allStatuses = Object.values(ProposalStatus)
      allStatuses.forEach(status => {
        expect(statusLabels).toHaveProperty(status)
      })
    })

    test('statusColors 包含所有狀態', () => {
      const allStatuses = Object.values(ProposalStatus)
      allStatuses.forEach(status => {
        expect(statusColors).toHaveProperty(status)
      })
    })
  })
})
