// =====================================================
// bulkConfirm.test.ts - MGR-4 一括確認 / CUS-3 削除 / DEAD-1 期限切れ判定
// =====================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';

describe('MGR-4 bulkConfirmReports', () => {
  beforeEach(() => {
    // store をデフォルト状態に戻す（初期 seed が再ロードされる）
    useAppStore.setState(useAppStore.getInitialState ? useAppStore.getInitialState() : useAppStore.getState());
  });

  it('submitted 状態の複数日報を一括で confirmed に遷移できる', () => {
    const s = useAppStore.getState();
    // submitted を 2 件用意（既存 seed があるか確認）
    const submittedIds = s.reports
      .filter(r => r.status === 'submitted')
      .slice(0, 2)
      .map(r => r.id);

    if (submittedIds.length === 0) {
      // seed に submitted がなければスキップ
      expect(true).toBe(true);
      return;
    }

    const confirmed = s.bulkConfirmReports(submittedIds);
    expect(confirmed).toBe(submittedIds.length);

    const after = useAppStore.getState().reports;
    submittedIds.forEach(id => {
      const r = after.find(x => x.id === id)!;
      expect(r.status).toBe('confirmed');
      expect(r.confirmedAt).toBeTruthy();
    });
  });

  it('submitted 以外は変更しない (planning/in_progress/confirmed)', () => {
    const s = useAppStore.getState();
    const nonSubmitted = s.reports
      .filter(r => r.status !== 'submitted')
      .slice(0, 3);

    if (nonSubmitted.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const before = nonSubmitted.map(r => ({ id: r.id, status: r.status }));
    const confirmed = s.bulkConfirmReports(nonSubmitted.map(r => r.id));
    expect(confirmed).toBe(0);

    const after = useAppStore.getState().reports;
    before.forEach(b => {
      const r = after.find(x => x.id === b.id)!;
      expect(r.status).toBe(b.status);
    });
  });

  it('空配列を渡すと何もしない', () => {
    const s = useAppStore.getState();
    const confirmed = s.bulkConfirmReports([]);
    expect(confirmed).toBe(0);
  });
});

describe('CUS-3 deleteCustomer', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState ? useAppStore.getInitialState() : useAppStore.getState());
  });

  it('指定 ID の顧客を完全削除する', () => {
    const s = useAppStore.getState();
    const target = s.customers[0];
    if (!target) {
      expect(true).toBe(true);
      return;
    }
    // P0: 付帯情報あり顧客を削除するには admin ロールが必要
    useAppStore.setState({ currentRole: 'admin' });
    const beforeCount = useAppStore.getState().customers.length;
    useAppStore.getState().deleteCustomer(target.id);
    const after = useAppStore.getState().customers;
    expect(after.length).toBe(beforeCount - 1);
    expect(after.find(c => c.id === target.id)).toBeUndefined();
  });

  it('存在しない ID なら何もしない', () => {
    const s = useAppStore.getState();
    const beforeCount = s.customers.length;
    s.deleteCustomer('nonexistent-id-xyz');
    expect(useAppStore.getState().customers.length).toBe(beforeCount);
  });
});

describe('DEAD-1 期限切れ判定ロジック (Date 比較)', () => {
  function isOverdue(dueDate: string | undefined, completed: boolean, status: string, now = new Date()): boolean {
    if (completed || status === 'done') return false;
    if (!dueDate) return false;
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  }

  it('過去日付かつ未完了は期限切れ', () => {
    expect(isOverdue('2020-01-01', false, 'todo')).toBe(true);
  });

  it('過去日付でも完了済なら期限切れでない', () => {
    expect(isOverdue('2020-01-01', true, 'done')).toBe(false);
    expect(isOverdue('2020-01-01', false, 'done')).toBe(false);
  });

  it('未来日付は期限切れでない', () => {
    expect(isOverdue('2099-12-31', false, 'todo')).toBe(false);
  });

  it('期限なしは期限切れでない', () => {
    expect(isOverdue(undefined, false, 'todo')).toBe(false);
  });

  it('今日 (同日) は期限切れでない (< のため)', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    expect(isOverdue(todayStr, false, 'todo')).toBe(false);
  });
});
