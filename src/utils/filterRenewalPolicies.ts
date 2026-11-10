// =====================================================
// filterRenewalPolicies — 更新一覧の抽出ロジック（純粋関数）
//
// 損害保険（NONLIFE_CATEGORIES）かつ renewalDate あり・inforce のみを
// renewalDate 昇順で返す。世帯グループ化は呼び出し側が行う。
// =====================================================
import { differenceInCalendarDays, parseISO } from "date-fns";
import { NONLIFE_CATEGORIES } from "../types/opportunity";
import type { Policy } from "../types/policy";

/** 更新まで何日以内を「近い」とするか（デフォルト60日） */
export const RENEWAL_NEAR_DAYS = 60;

/**
 * 損保更新対象ポリシーを抽出し renewalDate 昇順で返す。
 *
 * - productCategory ∈ NONLIFE_CATEGORIES
 * - renewalDate が設定されている
 * - status === 'inforce'
 */
export function filterRenewalPolicies(policies: Policy[]): Policy[] {
  return policies
    .filter(
      (p) =>
        p.status === "inforce" &&
        !!p.renewalDate &&
        NONLIFE_CATEGORIES.includes(
          p.productCategory as (typeof NONLIFE_CATEGORIES)[number],
        ),
    )
    .sort((a, b) => {
      // renewalDate はフィルタ済みなので必ず存在する
      return a.renewalDate!.localeCompare(b.renewalDate!);
    });
}

/**
 * 指定日から renewalDate までの日数を返す。
 * renewalDate が未設定の場合は Infinity。
 */
export function daysUntilRenewal(
  policy: Policy,
  today: Date = new Date(),
): number {
  if (!policy.renewalDate) return Infinity;
  return differenceInCalendarDays(parseISO(policy.renewalDate), today);
}

/**
 * 更新が近い（RENEWAL_NEAR_DAYS 以内）かどうか。
 * 過去日（マイナス）も「期限切れ」として near 扱いとする。
 */
export function isRenewalNear(
  policy: Policy,
  today: Date = new Date(),
): boolean {
  const days = daysUntilRenewal(policy, today);
  return days <= RENEWAL_NEAR_DAYS;
}
