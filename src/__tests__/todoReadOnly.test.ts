/**
 * todoReadOnly.test.ts
 *
 * isTodoReadOnly / getTodoReadOnlyReason ユーティリティの単体テスト。
 *
 * BUG-B 残存修正: Today 画面での期限切れ TODO 変更可能問題の解決を保証する。
 */
import { describe, it, expect } from 'vitest';
import { isTodoReadOnly, getTodoReadOnlyReason } from '../utils/todoReadOnly';


const TODAY = '2026-06-04';
const YESTERDAY = '2026-06-03';
const TOMORROW = '2026-06-05';

describe('isTodoReadOnly', () => {
  describe('ルール1: 提出済み / 確認済み日報由来 → 常に読み取り専用', () => {
    it('status=submitted, dueDate なし → true', () => {
      expect(isTodoReadOnly({}, 'submitted', TODAY)).toBe(true);
    });

    it('status=confirmed, dueDate なし → true', () => {
      expect(isTodoReadOnly({}, 'confirmed', TODAY)).toBe(true);
    });

    it('status=submitted, dueDate=明日 → true (期限関係なく提出済みは封鎖)', () => {
      expect(isTodoReadOnly({ dueDate: TOMORROW }, 'submitted', TODAY)).toBe(true);
    });

    it('status=confirmed, dueDate=昨日 → true', () => {
      expect(isTodoReadOnly({ dueDate: YESTERDAY }, 'confirmed', TODAY)).toBe(true);
    });
  });

  describe('ルール2: 期限切れ (dueDate < today) → 読み取り専用', () => {
    it('status=planning, dueDate=昨日 → true', () => {
      expect(isTodoReadOnly({ dueDate: YESTERDAY }, 'planning', TODAY)).toBe(true);
    });

    it('status=in_progress, dueDate=昨日 → true', () => {
      expect(isTodoReadOnly({ dueDate: YESTERDAY }, 'in_progress', TODAY)).toBe(true);
    });

    it('status=planning, dueDate=今日 → false (今日は期限切れではない)', () => {
      expect(isTodoReadOnly({ dueDate: TODAY }, 'planning', TODAY)).toBe(false);
    });

    it('status=planning, dueDate=明日 → false', () => {
      expect(isTodoReadOnly({ dueDate: TOMORROW }, 'planning', TODAY)).toBe(false);
    });

    it('status=in_progress, dueDate なし → false', () => {
      expect(isTodoReadOnly({}, 'in_progress', TODAY)).toBe(false);
    });
  });

  describe('対照: 編集可能なケース', () => {
    it('status=planning, dueDate なし → false', () => {
      expect(isTodoReadOnly({}, 'planning', TODAY)).toBe(false);
    });

    it('status=in_progress, dueDate=今日 → false', () => {
      expect(isTodoReadOnly({ dueDate: TODAY }, 'in_progress', TODAY)).toBe(false);
    });

    it('status=in_progress, dueDate=明日 → false', () => {
      expect(isTodoReadOnly({ dueDate: TOMORROW }, 'in_progress', TODAY)).toBe(false);
    });
  });

  describe('today 省略時: 実行時の日付を使用', () => {
    it('dueDate=未来日付 → false (today 省略)', () => {
      // 未来日付は常に期限切れでない
      expect(isTodoReadOnly({ dueDate: '2099-12-31' }, 'planning')).toBe(false);
    });

    it('dueDate=過去日付 → true (today 省略)', () => {
      // 過去の日付は常に期限切れ
      expect(isTodoReadOnly({ dueDate: '2020-01-01' }, 'planning')).toBe(true);
    });
  });
});

describe('getTodoReadOnlyReason', () => {
  it('status=submitted → 提出済みメッセージを返す', () => {
    const reason = getTodoReadOnlyReason({}, 'submitted', TODAY);
    expect(reason).toContain('提出済み');
  });

  it('status=confirmed → 提出済みメッセージを返す', () => {
    const reason = getTodoReadOnlyReason({}, 'confirmed', TODAY);
    expect(reason).toContain('提出済み');
  });

  it('status=planning, dueDate=昨日 → 期限切れメッセージを返す', () => {
    const reason = getTodoReadOnlyReason({ dueDate: YESTERDAY }, 'planning', TODAY);
    expect(reason).toContain('期限切れ');
  });

  it('status=planning, dueDate なし → null を返す (変更可能)', () => {
    const reason = getTodoReadOnlyReason({}, 'planning', TODAY);
    expect(reason).toBeNull();
  });

  it('status=in_progress, dueDate=今日 → null を返す', () => {
    const reason = getTodoReadOnlyReason({ dueDate: TODAY }, 'in_progress', TODAY);
    expect(reason).toBeNull();
  });

  describe('優先度: 提出済み判定は期限切れより優先', () => {
    it('status=submitted, dueDate=昨日 → 提出済みメッセージ (期限切れより先)', () => {
      const reason = getTodoReadOnlyReason({ dueDate: YESTERDAY }, 'submitted', TODAY);
      // 提出済みが先に評価されるのでメッセージは「提出済み」
      expect(reason).toContain('提出済み');
    });
  });
});

describe('組み合わせテスト: BUG-B シナリオ再現', () => {
  it('法人アポ取り (〜06-01) が Today 画面 (planning) で表示 → 読み取り専用', () => {
    // 鳳凰殿が指摘した具体的シナリオ: dueDate=2026-06-01, today=2026-06-04
    const todo = { dueDate: '2026-06-01' };
    expect(isTodoReadOnly(todo, 'planning', '2026-06-04')).toBe(true);
    expect(getTodoReadOnlyReason(todo, 'planning', '2026-06-04')).toContain('期限切れ');
  });

  it('今日期限の TODO は今日まだ変更可能', () => {
    const todo = { dueDate: '2026-06-04' };
    expect(isTodoReadOnly(todo, 'in_progress', '2026-06-04')).toBe(false);
  });

  it('明日期限の TODO は変更可能', () => {
    const todo = { dueDate: '2026-06-05' };
    expect(isTodoReadOnly(todo, 'planning', '2026-06-04')).toBe(false);
  });

  it('期限なしの TODO は変更可能', () => {
    const todo = {};
    expect(isTodoReadOnly(todo, 'in_progress', '2026-06-04')).toBe(false);
  });
});
