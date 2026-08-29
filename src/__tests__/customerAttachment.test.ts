/**
 * customerAttachment.test.ts
 * P0: 顧客削除権限の付帯情報判定テスト
 */
import { describe, it, expect } from 'vitest';
import { hasCustomerAttachment, canDeleteCustomer } from '../utils/customerAttachment';
import type { AttachmentCheckState } from '../utils/customerAttachment';
import type { DailyReport, Role } from '../types';

// ─── テスト用最小データビルダー ─────────────────────────────────────────────

function makeReport(overrides: Partial<DailyReport> = {}): DailyReport {
  return {
    id: 'r1',
    userId: 'u1',
    date: '2026-06-04',
    status: 'draft',
    mainTheme: '',
    monthlyTheme: '',
    dailyTheme: '',
    blocks: [],
    todos: [],
    customerVisits: [],
    gratitude: [],
    morningMood: null,
    eveningMood: null,
    managerSignal: 'none',
    selfComment: '',
    comments: [],
    attachments: [],
    submitted: false,
    createdAt: '2026-06-04T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
    ...overrides,
  };
}

const EMPTY_STATE: AttachmentCheckState = { reports: [] };

// ─── hasCustomerAttachment ───────────────────────────────────────────────────

describe('hasCustomerAttachment', () => {
  it('付帯情報なし: レポートが空の場合 false を返す', () => {
    expect(hasCustomerAttachment(EMPTY_STATE, 'c1')).toBe(false);
  });

  it('付帯情報なし: 他の顧客 ID しか含まれない場合 false を返す', () => {
    const state: AttachmentCheckState = {
      reports: [
        makeReport({
          blocks: [
            { id: 'b1', reportId: 'r1', type: 'visit', startTime: '09:00', endTime: '10:00',
              customerId: 'c_other', title: '', memo: '', isPlanned: false, isActual: true, attachments: [] },
          ],
        }),
      ],
    };
    expect(hasCustomerAttachment(state, 'c1')).toBe(false);
  });

  it('付帯情報あり: blocks[].customerId に一致する場合 true を返す', () => {
    const state: AttachmentCheckState = {
      reports: [
        makeReport({
          blocks: [
            { id: 'b1', reportId: 'r1', type: 'visit', startTime: '09:00', endTime: '10:00',
              customerId: 'c1', title: '', memo: '', isPlanned: false, isActual: true, attachments: [] },
          ],
        }),
      ],
    };
    expect(hasCustomerAttachment(state, 'c1')).toBe(true);
  });

  it('付帯情報あり: todos[].customerId に一致する場合 true を返す', () => {
    const state: AttachmentCheckState = {
      reports: [
        makeReport({
          todos: [
            { id: 't1', reportId: 'r1', text: 'Todo', completed: false,
              status: 'todo', rolledOver: false, priority: 'medium',
              // customerId は Todo 型の拡張フィールドとして扱う
              ...({ customerId: 'c1' } as object) } as import('../types').Todo,
          ],
        }),
      ],
    };
    expect(hasCustomerAttachment(state, 'c1')).toBe(true);
  });

  it('付帯情報あり: 複数レポートの 2 件目で一致した場合 true を返す', () => {
    const state: AttachmentCheckState = {
      reports: [
        makeReport({ id: 'r1' }),
        makeReport({
          id: 'r2',
          blocks: [
            { id: 'b2', reportId: 'r2', type: 'visit', startTime: '14:00', endTime: '15:00',
              customerId: 'c1', title: '', memo: '', isPlanned: false, isActual: true, attachments: [] },
          ],
        }),
      ],
    };
    expect(hasCustomerAttachment(state, 'c1')).toBe(true);
  });
});

// ─── canDeleteCustomer ───────────────────────────────────────────────────────

describe('canDeleteCustomer', () => {
  it('未ログイン (currentRole=undefined) は常に false', () => {
    expect(canDeleteCustomer(EMPTY_STATE, 'c1', undefined)).toBe(false);
    const stateWithAttach: AttachmentCheckState = {
      reports: [makeReport({ blocks: [{ id: 'b1', reportId: 'r1', type: 'visit', startTime: '09:00', endTime: '10:00',
        customerId: 'c1', title: '', memo: '', isPlanned: false, isActual: true, attachments: [] }] })],
    };
    expect(canDeleteCustomer(stateWithAttach, 'c1', undefined)).toBe(false);
  });

  describe('付帯情報なし (all roles can delete)', () => {
    const roles: Role[] = ['general', 'manager', 'executive', 'admin'];
    roles.forEach(role => {
      it(`role=${role} → true`, () => {
        expect(canDeleteCustomer(EMPTY_STATE, 'c1', role)).toBe(true);
      });
    });
  });

  describe('付帯情報あり (admin/executive のみ可)', () => {
    const stateWithAttach: AttachmentCheckState = {
      reports: [
        makeReport({
          blocks: [
            { id: 'b1', reportId: 'r1', type: 'visit', startTime: '09:00', endTime: '10:00',
              customerId: 'c1', title: '', memo: '', isPlanned: false, isActual: true, attachments: [] },
          ],
        }),
      ],
    };

    it('role=admin → true', () => {
      expect(canDeleteCustomer(stateWithAttach, 'c1', 'admin')).toBe(true);
    });

    it('role=executive → true', () => {
      expect(canDeleteCustomer(stateWithAttach, 'c1', 'executive')).toBe(true);
    });

    it('role=manager → false', () => {
      expect(canDeleteCustomer(stateWithAttach, 'c1', 'manager')).toBe(false);
    });

    it('role=general → false', () => {
      expect(canDeleteCustomer(stateWithAttach, 'c1', 'general')).toBe(false);
    });
  });
});
