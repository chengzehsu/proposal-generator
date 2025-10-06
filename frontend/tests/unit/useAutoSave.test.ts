/**
 * useAutoSave Hook 測試
 */

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useAutoSave, SaveStatus } from '@/hooks/useAutoSave';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('useAutoSave', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllTimers();
  });

  test('應該在內容變更後自動儲存', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 100,
          storageKey: 'test_key',
        }),
      {
        initialProps: { data: 'initial content' },
      }
    );

    // 初始狀態
    expect(result.current.status).toBe(SaveStatus.IDLE);

    // 變更內容
    rerender({ data: 'updated content' });

    // 等待防抖和自動儲存
    await waitFor(
      () => {
        expect(mockSave).toHaveBeenCalledWith('updated content');
      },
      { timeout: 3000 }
    );

    expect(result.current.status).toBe(SaveStatus.SAVED);
    expect(result.current.lastSaved).not.toBeNull();
  });

  test('網路中斷時應儲存到 LocalStorage', async () => {
    // 模擬離線
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const mockSave = jest.fn();
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 100,
          storageKey: 'test_offline_key',
          enableOfflineBackup: true,
        }),
      {
        initialProps: { data: 'initial' },
      }
    );

    // 變更內容
    rerender({ data: 'offline content' });

    // 等待防抖
    await waitFor(
      () => {
        expect(result.current.status).toBe(SaveStatus.OFFLINE);
      },
      { timeout: 3000 }
    );

    // 不應該呼叫 onSave (因為離線)
    expect(mockSave).not.toHaveBeenCalled();

    // 應該儲存到 LocalStorage
    const stored = localStorageMock.getItem('test_offline_key');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toBe('offline content');
  });

  test('網路恢復後應自動同步', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);

    // 初始離線
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result, rerender } = renderHook(() =>
      useAutoSave({
        data: 'content',
        onSave: mockSave,
        storageKey: 'test_sync_key',
        enableOfflineBackup: true,
      })
    );

    expect(result.current.isOffline).toBe(true);

    // 模擬網路恢復
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    rerender();

    // 等待自動同步
    await waitFor(
      () => {
        expect(result.current.isOffline).toBe(false);
        expect(mockSave).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  test('儲存失敗時應備份到 LocalStorage', async () => {
    const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 100,
          storageKey: 'test_error_key',
          enableOfflineBackup: true,
        }),
      {
        initialProps: { data: 'initial' },
      }
    );

    // 變更內容
    rerender({ data: 'failed content' });

    // 等待儲存失敗
    await waitFor(
      () => {
        expect(result.current.status).toBe(SaveStatus.ERROR);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Save failed');

    // 應該備份到 LocalStorage
    const stored = localStorageMock.getItem('test_error_key');
    expect(stored).toBeTruthy();
  });

  test('手動儲存應立即執行', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave({
        data: 'manual save content',
        onSave: mockSave,
        enabled: false, // 禁用自動儲存
      })
    );

    // 手動儲存
    await act(async () => {
      await result.current.save();
    });

    expect(mockSave).toHaveBeenCalledWith('manual save content');
    expect(result.current.status).toBe(SaveStatus.SAVED);
  });

  test('成功儲存後應清除離線備份', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);

    // 先設定離線備份
    localStorageMock.setItem('test_clear_key', JSON.stringify('old backup'));

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 100,
          storageKey: 'test_clear_key',
          enableOfflineBackup: true,
        }),
      {
        initialProps: { data: 'initial' },
      }
    );

    // 變更內容
    rerender({ data: 'new content' });

    // 等待成功儲存
    await waitFor(
      () => {
        expect(result.current.status).toBe(SaveStatus.SAVED);
      },
      { timeout: 3000 }
    );

    // LocalStorage 應該被清除
    const stored = localStorageMock.getItem('test_clear_key');
    expect(stored).toBeNull();
  });
});
