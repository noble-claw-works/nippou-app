// =====================================================
// salesPeriod.ts — 期間ユーティリティ
// =====================================================
export type PeriodType = 'monthly' | 'quarterly' | 'annual';

/** 会計年度開始月 (1=1月始まり)。hrl が4月始まり等ならここだけ変更 */
export const FISCAL_START_MONTH = 1;

/** Date → 各期間の period 文字列 */
export function toPeriod(date: Date, type: PeriodType): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1..12
  if (type === 'monthly') return `${y}-${String(m).padStart(2, '0')}`;
  if (type === 'annual') return `${y}`;
  const q = Math.floor((m - 1) / 3) + 1; // 1..4
  return `${y}-Q${q}`;
}

/** ある契約日 (YYYY-MM-DD) が、指定 period(type) に属するか */
export function dateInPeriod(dateStr: string, type: PeriodType, period: string): boolean {
  if (!dateStr) return false;
  const ym = dateStr.slice(0, 7); // 'YYYY-MM'
  const y = dateStr.slice(0, 4);  // 'YYYY'
  if (type === 'monthly') return ym === period;
  if (type === 'annual') return y === period;
  // quarterly: period='YYYY-Qn'
  const dashQIdx = period.indexOf('-Q');
  if (dashQIdx < 0) return false;
  const py = period.slice(0, dashQIdx);
  const pq = Number(period.slice(dashQIdx + 2));
  if (y !== py) return false;
  const m = Number(dateStr.slice(5, 7));
  const q = Math.floor((m - 1) / 3) + 1;
  return q === pq;
}

/** 指定 period 内に含まれる下位 period 群を返す(ロールアップ用) */
export function childPeriods(
  type: PeriodType,
  period: string,
): { monthly: string[]; quarterly: string[] } {
  if (type === 'monthly') return { monthly: [period], quarterly: [] };
  if (type === 'quarterly') {
    const dashQIdx = period.indexOf('-Q');
    const y = period.slice(0, dashQIdx);
    const q = Number(period.slice(dashQIdx + 2));
    const startM = (q - 1) * 3 + 1;
    const monthly = [0, 1, 2].map(i => `${y}-${String(startM + i).padStart(2, '0')}`);
    return { monthly, quarterly: [period] };
  }
  // annual → 4 四半期 + 12 か月
  const quarterly = [1, 2, 3, 4].map(n => `${period}-Q${n}`);
  const monthly = Array.from({ length: 12 }, (_, i) => `${period}-${String(i + 1).padStart(2, '0')}`);
  return { monthly, quarterly };
}

/** period を前後 1 単位ずらす(期間ナビ用) */
export function shiftPeriod(type: PeriodType, period: string, delta: number): string {
  if (type === 'monthly') {
    const [y, m] = period.split('-').map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    return toPeriod(dt, 'monthly');
  }
  if (type === 'annual') return `${Number(period) + delta}`;
  const dashQIdx = period.indexOf('-Q');
  const y = Number(period.slice(0, dashQIdx));
  const q = Number(period.slice(dashQIdx + 2));
  let ny = y,
    nq = q + delta;
  while (nq > 4) {
    nq -= 4;
    ny += 1;
  }
  while (nq < 1) {
    nq += 4;
    ny -= 1;
  }
  return `${ny}-Q${nq}`;
}

/**
 * カードレーン用: 指定年 + periodType に属する period 配列を順番に返す。
 *   monthly   → 12 本 ['2026-01' .. '2026-12']
 *   quarterly →  4 本 ['2026-Q1' .. '2026-Q4']
 *   annual    →  1 本 ['2026']
 */
export function periodsOfYear(year: number, type: PeriodType): string[] {
  if (type === 'annual') return [`${year}`];
  if (type === 'quarterly') return [1, 2, 3, 4].map(n => `${year}-Q${n}`);
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}

/** period ラベル表示用文字列 */
export function periodLabel(type: PeriodType, period: string): string {
  if (type === 'monthly') {
    const m = Number(period.slice(5, 7));
    return `${m}月`;
  }
  if (type === 'quarterly') {
    const dashQIdx = period.indexOf('-Q');
    const q = period.slice(dashQIdx + 2);
    return `Q${q}`;
  }
  return `${period}年`;
}
