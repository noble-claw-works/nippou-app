import { describe, it, expect } from 'vitest';
import {
  toPeriod,
  dateInPeriod,
  childPeriods,
  shiftPeriod,
  periodsOfYear,
} from '../utils/salesPeriod';

// =====================================================
// toPeriod
// =====================================================
describe('toPeriod', () => {
  it('monthly: 年と月を YYYY-MM 形式で返す', () => {
    expect(toPeriod(new Date(2026, 6, 5), 'monthly')).toBe('2026-07');
    expect(toPeriod(new Date(2026, 0, 1), 'monthly')).toBe('2026-01');
    expect(toPeriod(new Date(2026, 11, 31), 'monthly')).toBe('2026-12');
  });

  it('quarterly: 四半期を YYYY-Qn 形式で返す', () => {
    expect(toPeriod(new Date(2026, 0, 1), 'quarterly')).toBe('2026-Q1');   // Jan → Q1
    expect(toPeriod(new Date(2026, 2, 31), 'quarterly')).toBe('2026-Q1');  // Mar → Q1
    expect(toPeriod(new Date(2026, 3, 1), 'quarterly')).toBe('2026-Q2');   // Apr → Q2
    expect(toPeriod(new Date(2026, 5, 30), 'quarterly')).toBe('2026-Q2');  // Jun → Q2
    expect(toPeriod(new Date(2026, 6, 1), 'quarterly')).toBe('2026-Q3');   // Jul → Q3
    expect(toPeriod(new Date(2026, 8, 30), 'quarterly')).toBe('2026-Q3');  // Sep → Q3
    expect(toPeriod(new Date(2026, 9, 1), 'quarterly')).toBe('2026-Q4');   // Oct → Q4
    expect(toPeriod(new Date(2026, 11, 31), 'quarterly')).toBe('2026-Q4'); // Dec → Q4
  });

  it('annual: 年を YYYY 形式で返す', () => {
    expect(toPeriod(new Date(2026, 6, 5), 'annual')).toBe('2026');
  });
});

// =====================================================
// dateInPeriod
// =====================================================
describe('dateInPeriod', () => {
  it('monthly: 月が一致するとき true', () => {
    expect(dateInPeriod('2026-07-05', 'monthly', '2026-07')).toBe(true);
    expect(dateInPeriod('2026-07-31', 'monthly', '2026-07')).toBe(true);
  });

  it('monthly: 月が異なるとき false', () => {
    expect(dateInPeriod('2026-08-01', 'monthly', '2026-07')).toBe(false);
    expect(dateInPeriod('2026-06-30', 'monthly', '2026-07')).toBe(false);
  });

  it('quarterly: 3月末は Q1 / 4月頭は Q2', () => {
    expect(dateInPeriod('2026-03-31', 'quarterly', '2026-Q1')).toBe(true);
    expect(dateInPeriod('2026-04-01', 'quarterly', '2026-Q1')).toBe(false);
    expect(dateInPeriod('2026-04-01', 'quarterly', '2026-Q2')).toBe(true);
    expect(dateInPeriod('2026-09-30', 'quarterly', '2026-Q3')).toBe(true);
    expect(dateInPeriod('2026-10-01', 'quarterly', '2026-Q3')).toBe(false);
    expect(dateInPeriod('2026-10-01', 'quarterly', '2026-Q4')).toBe(true);
    expect(dateInPeriod('2026-12-31', 'quarterly', '2026-Q4')).toBe(true);
  });

  it('quarterly: 年が異なる場合は false', () => {
    expect(dateInPeriod('2025-07-01', 'quarterly', '2026-Q3')).toBe(false);
  });

  it('annual: 年が一致するとき true', () => {
    expect(dateInPeriod('2026-01-01', 'annual', '2026')).toBe(true);
    expect(dateInPeriod('2026-12-31', 'annual', '2026')).toBe(true);
    expect(dateInPeriod('2025-12-31', 'annual', '2026')).toBe(false);
  });

  it('空文字列は false', () => {
    expect(dateInPeriod('', 'monthly', '2026-07')).toBe(false);
  });
});

// =====================================================
// childPeriods
// =====================================================
describe('childPeriods', () => {
  it('monthly: monthly のみ1本を返す', () => {
    const r = childPeriods('monthly', '2026-07');
    expect(r.monthly).toEqual(['2026-07']);
    expect(r.quarterly).toEqual([]);
  });

  it('quarterly: Q3 → 7月・8月・9月を返す', () => {
    const r = childPeriods('quarterly', '2026-Q3');
    expect(r.monthly).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(r.quarterly).toEqual(['2026-Q3']);
  });

  it('quarterly: Q1 → 1月・2月・3月を返す', () => {
    const r = childPeriods('quarterly', '2026-Q1');
    expect(r.monthly).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('annual: 12ヶ月 + 4四半期を返す', () => {
    const r = childPeriods('annual', '2026');
    expect(r.quarterly).toHaveLength(4);
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly[0]).toBe('2026-01');
    expect(r.monthly[11]).toBe('2026-12');
    expect(r.quarterly).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
  });
});

// =====================================================
// shiftPeriod
// =====================================================
describe('shiftPeriod', () => {
  it('monthly: +1 で翌月', () => {
    expect(shiftPeriod('monthly', '2026-07', 1)).toBe('2026-08');
    expect(shiftPeriod('monthly', '2026-12', 1)).toBe('2027-01');
  });

  it('monthly: -1 で前月', () => {
    expect(shiftPeriod('monthly', '2026-01', -1)).toBe('2025-12');
    expect(shiftPeriod('monthly', '2026-07', -1)).toBe('2026-06');
  });

  it('quarterly: +1 で翌四半期', () => {
    expect(shiftPeriod('quarterly', '2026-Q3', 1)).toBe('2026-Q4');
    expect(shiftPeriod('quarterly', '2026-Q4', 1)).toBe('2027-Q1');
  });

  it('quarterly: -1 で前四半期', () => {
    expect(shiftPeriod('quarterly', '2026-Q1', -1)).toBe('2025-Q4');
  });

  it('annual: +1 で翌年', () => {
    expect(shiftPeriod('annual', '2026', 1)).toBe('2027');
    expect(shiftPeriod('annual', '2026', -1)).toBe('2025');
  });
});

// =====================================================
// periodsOfYear
// =====================================================
describe('periodsOfYear', () => {
  it('monthly: 12本を返す', () => {
    const p = periodsOfYear(2026, 'monthly');
    expect(p).toHaveLength(12);
    expect(p[0]).toBe('2026-01');
    expect(p[11]).toBe('2026-12');
  });

  it('quarterly: 4本を返す', () => {
    const p = periodsOfYear(2026, 'quarterly');
    expect(p).toHaveLength(4);
    expect(p).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
  });

  it('annual: 1本を返す', () => {
    const p = periodsOfYear(2026, 'annual');
    expect(p).toHaveLength(1);
    expect(p[0]).toBe('2026');
  });
});
