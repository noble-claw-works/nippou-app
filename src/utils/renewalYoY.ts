// =====================================================
// renewalYoY.ts — 損保更新 前年比（B5）。純関数。
// 更改保険料 = survey.consult.renewedPremium、前年 = prevYearPremium
// =====================================================
import type { RenewalCase } from "../types";

export type YoY =
  | { kind: "renewed"; diff: number; ratio: number | null }
  | { kind: "lost"; diff: number }
  | { kind: "none" };

export function calcYoY(
  c: Pick<RenewalCase, "status" | "prevYearPremium" | "survey">,
): YoY {
  const prev = c.prevYearPremium;
  if (c.status === "renewed") {
    const cur = c.survey?.consult?.renewedPremium;
    if (cur == null || prev == null) return { kind: "none" };
    const diff = cur - prev;
    const ratio = prev > 0 ? Math.round((diff / prev) * 1000) / 10 : null;
    return { kind: "renewed", diff, ratio };
  }
  if (c.status === "lost_to_competitor" || c.status === "cancelled") {
    if (prev == null) return { kind: "none" };
    return { kind: "lost", diff: -prev };
  }
  return { kind: "none" };
}

const yen = (n: number) => Math.abs(n).toLocaleString("ja-JP");
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±");

/** 「+12,000円（+3.2%）」「−85,000円（流出）」「—」 */
export function formatYoY(y: YoY, status?: RenewalCase["status"]): string {
  if (y.kind === "none") return "—";
  if (y.kind === "lost") {
    return `${sign(y.diff)}${yen(y.diff)}円（${status === "cancelled" ? "解約" : "流出"}）`;
  }
  const r =
    y.ratio == null ? "" : `（${sign(y.ratio)}${Math.abs(y.ratio).toFixed(1)}%）`;
  return `${sign(y.diff)}${yen(y.diff)}円${r}`;
}

/** 色: 増=緑 / 減(流出含む)=赤 / その他=灰 */
export function yoyColorClass(y: YoY): string {
  if (y.kind === "none") return "text-gray-300";
  return y.diff > 0 ? "text-green-600" : y.diff < 0 ? "text-red-600" : "text-gray-600";
}

/**
 * 合計。prevTotal=対象全件の前年合計 / renewedTotal=更改済の更改合計 /
 * diffTotal=更改済の増減 + 流出・解約の −前年（未対応・対応中は含めない）
 */
export function summarizeYoY(
  cases: Pick<RenewalCase, "status" | "prevYearPremium" | "survey">[],
): { prevTotal: number; renewedTotal: number; diffTotal: number } {
  let prevTotal = 0;
  let renewedTotal = 0;
  let diffTotal = 0;
  for (const c of cases) {
    prevTotal += c.prevYearPremium ?? 0;
    const y = calcYoY(c);
    if (y.kind === "renewed") {
      renewedTotal += c.survey?.consult?.renewedPremium ?? 0;
      diffTotal += y.diff;
    } else if (y.kind === "lost") {
      diffTotal += y.diff;
    }
  }
  return { prevTotal, renewedTotal, diffTotal };
}

/** Q6: 更改保険料は必須。入力済 or 前年保険料(既定値)があれば更改済にできる */
export function canMarkRenewed(
  c: Pick<RenewalCase, "prevYearPremium" | "survey">,
): boolean {
  return c.survey?.consult?.renewedPremium != null || c.prevYearPremium != null;
}

/** Q6: 更改保険料が空なら前年保険料と同額を自動入力した survey を返す（入力済なら同じ参照） */
export function withDefaultRenewedPremium(
  c: Pick<RenewalCase, "prevYearPremium" | "survey">,
  now: string,
): RenewalCase["survey"] {
  if (c.survey?.consult?.renewedPremium != null || c.prevYearPremium == null) {
    return c.survey;
  }
  return {
    ...(c.survey ?? {}),
    consult: {
      ...(c.survey?.consult ?? {}),
      renewedPremium: c.prevYearPremium,
    },
    updatedAt: now,
  } as RenewalCase["survey"];
}
