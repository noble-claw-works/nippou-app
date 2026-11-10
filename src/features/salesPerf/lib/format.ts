// =====================================================
// salesPerf/lib/format.ts — 表示フォーマット
// =====================================================

/**
 * 円カンマ区切り表示 (例: 1,234,567)
 */
export function formatYen(value: number | null | undefined): string {
  if (value === null || value === undefined) return '−';
  return value.toLocaleString('ja-JP') + '円';
}

/**
 * 百万円丸め表示 (例: 1.2百万円)
 */
export function formatMillionYen(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '−';
  const millions = value / 1_000_000;
  return millions.toFixed(decimals) + '百万円';
}

/**
 * パーセント表示 (例: 73.5%)
 * null → '−'
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '−';
  return value.toFixed(decimals) + '%';
}

/**
 * 件数表示
 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '−';
  return value.toLocaleString('ja-JP') + '件';
}

/**
 * 金額: 百万円丸めトグル対応
 * @param value 金額 (円)
 * @param showMillions true=百万円表示, false=円表示
 */
export function formatAmount(value: number | null | undefined, showMillions = false): string {
  if (value === null || value === undefined) return '−';
  if (showMillions) return formatMillionYen(value);
  return formatYen(value);
}

/**
 * 進捗率など: null → '−', それ以外はパーセント
 */
export function formatRate(value: number | null | undefined): string {
  return formatPercent(value);
}
