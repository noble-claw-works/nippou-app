import { describe, it, expect } from 'vitest';
import {
  daysFromToday,
  daysFromFirstContact,
  daysAtProcedure,
  formatDayCount,
} from '../utils/renewalDays';

// =====================================================
// daysFromToday — 本日基点の満期残日数（§8.1 境界）
// =====================================================
describe('daysFromToday', () => {
  it('満期が未来なら正値（残り日数）', () => {
    expect(daysFromToday('2026-10-20', '2026-10-19')).toBe(1);
    expect(daysFromToday('2026-11-18', '2026-10-19')).toBe(30);
  });
  it('同日は 0', () => {
    expect(daysFromToday('2026-10-19', '2026-10-19')).toBe(0);
  });
  it('満期が過去なら負値（経過日数）', () => {
    expect(daysFromToday('2026-10-18', '2026-10-19')).toBe(-1);
  });
  it('maturityDate が空/undefined は null', () => {
    expect(daysFromToday(undefined, '2026-10-19')).toBeNull();
    expect(daysFromToday('', '2026-10-19')).toBeNull();
  });
  it('不正日付は null', () => {
    expect(daysFromToday('not-a-date', '2026-10-19')).toBeNull();
  });
});

// =====================================================
// daysFromFirstContact — 満期 − FC日
// =====================================================
describe('daysFromFirstContact', () => {
  it('満期 − FC日 を返す', () => {
    expect(daysFromFirstContact('2026-12-01', '2026-11-01')).toBe(30);
  });
  it('FC日が満期より後なら負値', () => {
    expect(daysFromFirstContact('2026-11-01', '2026-12-01')).toBe(-30);
  });
  it('いずれか欠損は null', () => {
    expect(daysFromFirstContact('2026-12-01', undefined)).toBeNull();
    expect(daysFromFirstContact(undefined, '2026-11-01')).toBeNull();
  });
});

// =====================================================
// daysAtProcedure — 手続日 − 満期日（満期前=負値）
// =====================================================
describe('daysAtProcedure', () => {
  it('手続が満期後なら正値', () => {
    expect(daysAtProcedure('2026-12-05', '2026-12-01')).toBe(4);
  });
  it('満期前手続きは負値（§8.1 満期前=負値）', () => {
    expect(daysAtProcedure('2026-11-20', '2026-12-01')).toBe(-11);
  });
  it('同日は 0', () => {
    expect(daysAtProcedure('2026-12-01', '2026-12-01')).toBe(0);
  });
  it('いずれか欠損は null', () => {
    expect(daysAtProcedure(undefined, '2026-12-01')).toBeNull();
    expect(daysAtProcedure('2026-12-05', undefined)).toBeNull();
  });
});

// =====================================================
// formatDayCount — 表示整形（§8.1 空→"—"・符号保持）
// =====================================================
describe('formatDayCount', () => {
  it('null は "—"', () => {
    expect(formatDayCount(null)).toBe('—');
  });
  it('正値は "N日"', () => {
    expect(formatDayCount(30)).toBe('30日');
    expect(formatDayCount(0)).toBe('0日');
  });
  it('負値は符号を保持', () => {
    expect(formatDayCount(-11)).toBe('-11日');
  });
  it('NaN は "—"', () => {
    expect(formatDayCount(NaN)).toBe('—');
  });
});
