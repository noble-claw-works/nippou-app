// =====================================================
// salesPerf/constants.ts — 営業実績ダッシュボード v1 定数
// =====================================================
import type { ConfidenceCode, ConfidenceAgg, SalesLine } from './types';

// ----------------------------------------
// 会計年度定義 (4月始まり)
// ----------------------------------------
/** 会計年度開始月 (暦月 1-12) */
export const FISCAL_START_MONTH = 4;

/** 既定年度 */
export const DEFAULT_FISCAL_YEAR = 2025;

/**
 * 暦月 (1-12) → 会計月 (1-12)
 * 例: 4月=1, 3月=12
 */
export function calMonthToFiscalMonth(calMonth: number): number {
  return ((calMonth - FISCAL_START_MONTH + 12) % 12) + 1;
}

/**
 * 会計月 (1-12) → 暦月 (1-12)
 */
export function fiscalMonthToCalMonth(fiscalMonth: number, fiscalYear: number): { year: number; month: number } {
  const m0 = (FISCAL_START_MONTH - 1 + fiscalMonth - 1) % 12;
  const calMonth = m0 + 1;
  const year = fiscalYear + Math.floor((FISCAL_START_MONTH - 1 + fiscalMonth - 1) / 12);
  return { year, month: calMonth };
}

/**
 * YYYY-MM-DD → 会計月 (1-12)。会計年度外なら null
 */
export function dateToFiscalMonth(dateStr: string, fiscalYear: number): number | null {
  if (!dateStr) return null;
  const y = parseInt(dateStr.slice(0, 4), 10);
  const m = parseInt(dateStr.slice(5, 7), 10);
  const fMonth = calMonthToFiscalMonth(m);
  // 会計月が属する会計年度を判定
  const actualFY = m >= FISCAL_START_MONTH ? y : y - 1;
  if (actualFY !== fiscalYear) return null;
  return fMonth;
}

/**
 * periodMode に対応する会計月範囲を返す
 */
export function fiscalMonthRange(periodMode: 'full' | 'h1' | 'h2' | 'single', singleMonth?: number): number[] {
  if (periodMode === 'full') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (periodMode === 'h1') return [1, 2, 3, 4, 5, 6];   // 上期 4-9月
  if (periodMode === 'h2') return [7, 8, 9, 10, 11, 12]; // 下期 10-3月
  if (periodMode === 'single' && singleMonth) return [singleMonth];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

// ----------------------------------------
// 確度ラダー定義
// ----------------------------------------
export const CONFIDENCE_LIFE_ORDER: ReadonlyArray<'fixed' | 'S' | 'A' | 'B' | 'first'> = [
  'fixed', 'S', 'A', 'B', 'first',
];

export const CONFIDENCE_NONLIFE_ORDER: ReadonlyArray<'fixed' | 'S' | 'A' | 'B' | 'C' | 'D'> = [
  'fixed', 'S', 'A', 'B', 'C', 'D',
];

export const CONFIDENCE_LIFE_LABELS: Record<string, string> = {
  fixed: '確定',
  S: 'S',
  A: 'A',
  B: 'B',
  first: '初見',
  unknown: '不明',
};

export const CONFIDENCE_NONLIFE_LABELS: Record<string, string> = {
  fixed: '確定',
  S: 'S',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  unknown: '不明',
};

/** 確度→集約軸マップ */
export const CONFIDENCE_TO_AGG: Record<ConfidenceCode | 'unknown', ConfidenceAgg | null> = {
  fixed: 'fixed',
  S: 'fixed_s',
  A: 'fixed_s_a',
  B: null,
  C: null,
  D: null,
  first: null,
  unknown: null,
};

/** 集約軸の表示ラベル */
export const CONFIDENCE_AGG_LABELS: Record<ConfidenceAgg, string> = {
  fixed: '確定',
  fixed_s: '確定＋S',
  fixed_s_a: '確定＋S＋A',
};

// ----------------------------------------
// 確度正規化マップ (表記ゆれ対応)
// ----------------------------------------
export const CONFIDENCE_NORMALIZE_LIFE: Record<string, 'fixed' | 'S' | 'A' | 'B' | 'first'> = {
  '確定': 'fixed',
  'かくてい': 'fixed',
  'fixed': 'fixed',
  'S': 'S',
  's': 'S',
  'エス': 'S',
  'A': 'A',
  'a': 'A',
  'エー': 'A',
  'B': 'B',
  'b': 'B',
  'ビー': 'B',
  '初見': 'first',
  'しょけん': 'first',
  'first': 'first',
};

export const CONFIDENCE_NORMALIZE_NONLIFE: Record<string, 'fixed' | 'S' | 'A' | 'B' | 'C' | 'D'> = {
  '確定': 'fixed',
  'かくてい': 'fixed',
  'fixed': 'fixed',
  'S': 'S',
  's': 'S',
  'エス': 'S',
  'A': 'A',
  'a': 'A',
  'エー': 'A',
  'B': 'B',
  'b': 'B',
  'ビー': 'B',
  'C': 'C',
  'c': 'C',
  'シー': 'C',
  'D': 'D',
  'd': 'D',
  'ディー': 'D',
};

// ----------------------------------------
// 目標値 (可変定数)
// ----------------------------------------
/** LP目標 (月次・全担当共通) */
export const LP_TARGET_PER_MONTH = 7;

/** 損保年間目標額 */
export const NONLIFE_ANNUAL_TARGET = 55_700_000;

/** 商品ライン別年間目標 */
export const LINE_ANNUAL_TARGET: Record<SalesLine, number> = {
  life: 48_000_000,
  nonlife: NONLIFE_ANNUAL_TARGET,
};

// ----------------------------------------
// 会計月ラベル
// ----------------------------------------
export const FISCAL_MONTH_LABELS: Record<number, string> = {
  1: '4月', 2: '5月', 3: '6月', 4: '7月', 5: '8月', 6: '9月',
  7: '10月', 8: '11月', 9: '12月', 10: '1月', 11: '2月', 12: '3月',
};
