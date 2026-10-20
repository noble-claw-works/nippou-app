// =====================================================
// reflectionAggregate.ts — Doc4 反映の集計 util / selector（§2.3 / PC-3）
// 純関数。受注ダイアログ Before/After 集計に使用。
// =====================================================
import type { Policy } from "../types";

/** 確定 / 見込(申込中=pending 含む) */
export type AggregateScope = "confirmed" | "projected";

/**
 * 契約配列から月払保険料の合計を算出。
 * - scope='confirmed': status!=='pending' のみ合計（申込中を除外）
 * - scope='projected': pending も含む（見込値）
 */
export function sumMonthlyPremium(
  policies: Policy[],
  scope: AggregateScope,
): number {
  const target =
    scope === "confirmed"
      ? policies.filter((p) => p.status !== "pending")
      : policies;
  return target.reduce((sum, p) => sum + (p.monthlyPremium || 0), 0);
}

/** 月払 → 年換算（monthly * 12） */
export function toAnnual(monthly: number): number {
  return monthly * 12;
}

/**
 * 受注ダイアログ Before/After 用: 反映前後の差分（after − before）。
 * - count: 件数差（scope でフィルタした母集団ベース）
 * - monthly: 月払合計差
 * - annual: 年換算差
 */
export function diffReflection(
  before: Policy[],
  after: Policy[],
  scope: AggregateScope,
): { count: number; monthly: number; annual: number } {
  const beforeTarget =
    scope === "confirmed"
      ? before.filter((p) => p.status !== "pending")
      : before;
  const afterTarget =
    scope === "confirmed" ? after.filter((p) => p.status !== "pending") : after;

  const monthly =
    sumMonthlyPremium(after, scope) - sumMonthlyPremium(before, scope);

  return {
    count: afterTarget.length - beforeTarget.length,
    monthly,
    annual: toAnnual(monthly),
  };
}
