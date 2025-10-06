/**
 * useOfflineStorage Hook 測試
 */

import { renderHook, act } from '@testing-library/react';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

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

describe('useOfflineStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('應該使用初始值初始化', () => {
    const { result } = renderHook(() =>
      useOfflineStorage('test_key', 'initial value')
    );

    const [value] = result.current;
    expect(value).toBe('initial value');
  });

  test('應該從 LocalStorage 讀取現有值', () => {
    localStorageMock.setItem('existing_key', JSON.stringify('stored value'));

    const { result } = renderHook(() =>
      useOfflineStorage('existing_key', 'initial value')
    );

    const [value] = result.current;
    expect(value).toBe('stored value');
  });

  test('應該更新值並同步到 LocalStorage', () => {
    const { result } = renderHook(() => useOfflineStorage('update_key', ''));

    act(() => {
      const [, setValue] = result.current;
      setValue('new value');
    });

    const [value] = result.current;
    expect(value).toBe('new value');

    const stored = localStorageMock.getItem('update_key');
    expect(JSON.parse(stored!)).toBe('new value');
  });

  test('應該支援函數式更新', () => {
    const { result } = renderHook(() => useOfflineStorage('fn_key', 10));

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 5);
    });

    const [value] = result.current;
    expect(value).toBe(15);
  });

  test('應該移除值', () => {
    localStorageMock.setItem('remove_key', JSON.stringify('to be removed'));

    const { result } = renderHook(() =>
      useOfflineStorage('remove_key', 'default')
    );

    act(() => {
      const [, , removeValue] = result.current;
      removeValue();
    });

    const [value] = result.current;
    expect(value).toBe('default');

    const stored = localStorageMock.getItem('remove_key');
    expect(stored).toBeNull();
  });

  test('應該處理複雜物件', () => {
    interface TestData {
      id: number;
      name: string;
      items: string[];
    }

    const initialData: TestData = {
      id: 1,
      name: 'Test',
      items: ['a', 'b'],
    };

    const { result } = renderHook(() =>
      useOfflineStorage<TestData>('object_key', initialData)
    );

    act(() => {
      const [, setValue] = result.current;
      setValue({
        id: 2,
        name: 'Updated',
        items: ['c', 'd', 'e'],
      });
    });

    const [value] = result.current;
    expect(value.id).toBe(2);
    expect(value.name).toBe('Updated');
    expect(value.items).toEqual(['c', 'd', 'e']);
  });

  test('解析錯誤時應使用初始值', () => {
    // 設定無效的 JSON
    localStorageMock.setItem('invalid_key', 'invalid json{]');

    const { result } = renderHook(() =>
      useOfflineStorage('invalid_key', 'fallback')
    );

    const [value] = result.current;
    expect(value).toBe('fallback');
  });

  test('應該監聽其他視窗的 storage 變更', () => {
    const { result } = renderHook(() => useOfflineStorage('sync_key', 'initial'));

    // 模擬其他視窗的 storage 事件
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'sync_key',
        newValue: JSON.stringify('updated from another window'),
      });
      window.dispatchEvent(event);
    });

    const [value] = result.current;
    expect(value).toBe('updated from another window');
  });
});
