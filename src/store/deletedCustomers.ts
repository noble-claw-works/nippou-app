// =====================================================
// deletedCustomers.ts - 削除済み顧客 ID の localStorage 永続化
// E-8 修正: ページリロード後も削除状態を保持する
// =====================================================

export const DELETED_CUSTOMERS_STORAGE_KEY = 'nippou.deletedCustomerIds.v1';

/** localStorage から削除済み顧客 ID セットを読み込む */
export function loadDeletedCustomerIds(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_CUSTOMERS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed as string[]);
  } catch {
    return new Set();
  }
}

/** 削除済み顧客 ID セットを localStorage に保存する */
export function saveDeletedCustomerIds(ids: Set<string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      DELETED_CUSTOMERS_STORAGE_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // noop (storage quota exceeded など)
  }
}

/** 1 件の顧客 ID を削除済みとして追加・保存する */
export function persistDeletedCustomerId(id: string): void {
  const ids = loadDeletedCustomerIds();
  ids.add(id);
  saveDeletedCustomerIds(ids);
}
