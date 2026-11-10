// =====================================================================
// batchEntryNavigation.test.ts
// B-2c: 日報導線接続 — 純粋関数のunit test
// - canActivateBatchEntry: 実績入力中のみ true
// - resolveBackUrl: from パラメータ別の戻り先解決
// =====================================================================
import { describe, it, expect } from 'vitest';
import { canActivateBatchEntry, resolveBackUrl } from '../utils/batchEntryNavigation';

describe('canActivateBatchEntry (§9 主上確定 #2: 実績入力中のみ導線活性化)', () => {
  it('in_progress のとき true を返す', () => {
    expect(canActivateBatchEntry('in_progress')).toBe(true);
  });

  it('planning のとき false を返す（予定段階は非活性 §9 #3）', () => {
    expect(canActivateBatchEntry('planning')).toBe(false);
  });

  it('submitted のとき false を返す（提出済み）', () => {
    expect(canActivateBatchEntry('submitted')).toBe(false);
  });

  it('confirmed のとき false を返す（確認済み）', () => {
    expect(canActivateBatchEntry('confirmed')).toBe(false);
  });

  it('undefined のとき false を返す（日報未作成）', () => {
    expect(canActivateBatchEntry(undefined)).toBe(false);
  });

  it('空文字のとき false を返す', () => {
    expect(canActivateBatchEntry('')).toBe(false);
  });
});

describe('resolveBackUrl (B-2c: from パラメータの戻り先解決)', () => {
  it('from=today のとき /today を返す', () => {
    expect(resolveBackUrl('today')).toBe('/today');
  });

  it('from=report:2026-07-12 のとき /reports/2026-07-12 を返す', () => {
    expect(resolveBackUrl('report:2026-07-12')).toBe('/reports/2026-07-12');
  });

  it('from=report:2026-01-01 のとき /reports/2026-01-01 を返す（別日付）', () => {
    expect(resolveBackUrl('report:2026-01-01')).toBe('/reports/2026-01-01');
  });

  it('from=null のとき fallback(/households) を返す', () => {
    expect(resolveBackUrl(null)).toBe('/households');
  });

  it('from=undefined のとき fallback(/households) を返す', () => {
    expect(resolveBackUrl(undefined)).toBe('/households');
  });

  it('from=unknown のとき fallback(/households) を返す（不明な値）', () => {
    expect(resolveBackUrl('unknown')).toBe('/households');
  });

  it('fallback 引数を明示した場合、指定した値を使う', () => {
    expect(resolveBackUrl(null, '/customers')).toBe('/customers');
  });

  it('from=today のとき、fallback 引数より from=today を優先する', () => {
    expect(resolveBackUrl('today', '/customers')).toBe('/today');
  });
});
