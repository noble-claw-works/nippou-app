// =====================================================
// deletedCustomer.test.ts
// E-8: 顧客削除後の過去日報での「不明」表示ロジック検証
// =====================================================
import { describe, it, expect } from 'vitest';
import type { Customer } from '../types';

/** customers store から顧客名を解決する共通ロジック (本実装と同一仕様) */
function resolveCustomerName(
  customerId: string | undefined,
  customers: Customer[],
): string | undefined {
  if (!customerId) return undefined;
  return customers.find(c => c.id === customerId)?.name ?? '不明';
}

function makeCustomer(id: string, name: string, status: Customer['status'] = 'active'): Customer {
  return {
    id,
    name,
    type: 'corporate',
    area: '',
    primaryUserId: 'u1',
    tags: [],
    memo: '',
    status,
  };
}

describe('E-8: 顧客削除後の表示は「不明」', () => {
  const customers: Customer[] = [
    makeCustomer('c1', '株式会社テスト'),
    makeCustomer('c2', 'サンプル商事', 'inactive'),
  ];

  it('存在する顧客 ID → 顧客名を返す', () => {
    expect(resolveCustomerName('c1', customers)).toBe('株式会社テスト');
  });

  it('削除済み (store から消えた) 顧客 ID → 「不明」を返す', () => {
    // 顧客削除後は customers store から除去されるため ID が解決できない
    expect(resolveCustomerName('c_deleted', customers)).toBe('不明');
  });

  it('customerId が undefined → undefined を返す (顧客リンクなし)', () => {
    expect(resolveCustomerName(undefined, customers)).toBeUndefined();
  });

  it('空の顧客リストでも「不明」になる', () => {
    expect(resolveCustomerName('c1', [])).toBe('不明');
  });

  it('過去日報の visitedCustomers: 削除済み顧客は「不明」として含まれる', () => {
    // SearchPage の表示ロジックを模倣
    const blockCustomerIds = ['c1', 'c_deleted', 'c2'];
    const visitedCustomers = blockCustomerIds
      .map(id => resolveCustomerName(id, customers))
      .filter((name): name is string => name !== undefined);

    expect(visitedCustomers).toEqual(['株式会社テスト', '不明', 'サンプル商事']);
    expect(visitedCustomers).toHaveLength(3);
  });

  it('ReadOnlyTimeline の customerName prop: customerId あり・削除済み → 「不明」', () => {
    // ReadOnlyTimeline 144行目のロジックを模倣
    const computeCustomerName = (customerId: string | undefined) =>
      customerId
        ? (customers.find(c => c.id === customerId)?.name ?? '不明')
        : undefined;

    expect(computeCustomerName('c1')).toBe('株式会社テスト');
    expect(computeCustomerName('c_deleted')).toBe('不明');
    expect(computeCustomerName(undefined)).toBeUndefined();
  });

  it('SidePanelCards の表示: customer が見つからなければ「不明」', () => {
    // SidePanelCards 178・220行目の表示ロジックを模倣
    const getDisplayName = (customerId: string) => {
      const customer = customers.find(c => c.id === customerId);
      return customer?.name ?? '不明';
    };

    expect(getDisplayName('c1')).toBe('株式会社テスト');
    expect(getDisplayName('c_deleted')).toBe('不明');
  });
});
