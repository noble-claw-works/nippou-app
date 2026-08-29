// =====================================================================
// batchEntryNavigation.ts
// B-2c: 日報→世帯まとめ入力 導線 — 純粋ユーティリティ
// =====================================================================

/**
 * 日報ステータスが in_progress（実績入力中）のときのみ true を返す純粋関数。
 * §9 主上確定 #2: 実績入力中のみ世帯まとめ入力ボタンを活性化する。
 */
export function canActivateBatchEntry(reportStatus: string | undefined): boolean {
  return reportStatus === 'in_progress';
}

/**
 * from パラメータから戻り先 URL を解決する純粋関数。
 * §7 B-2c: from=today → /today, from=report:{date} → /reports/{date}, 未指定 → fallback
 */
export function resolveBackUrl(
  from: string | null | undefined,
  fallback = '/households'
): string {
  if (!from) return fallback;
  if (from === 'today') return '/today';
  if (from.startsWith('report:')) {
    const date = from.slice('report:'.length);
    return `/reports/${date}`;
  }
  return fallback;
}
