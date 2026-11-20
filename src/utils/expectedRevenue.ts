// =====================================================
// expectedRevenue.ts — 見込み収益 = Σ(初年度手数料 × 確度)（B2 / Q4）
// 対象: 進行中(status=open)の案件の提案商品。成立済み・失注は含めない。
// 確度は案件単位 Opportunity.confidence（fixed/S/A/B/C/D）。実コードに重みの定義が無いため
// ここに暫定重みを集約（変更はこの 1 か所）。確度未設定の案件は重み 0（集計外・件数だけ表示）。
// 成約予定日（Opportunity.expectedCloseDate）が無い案件は月別に混ぜず「期間未定」で別枠。
// =====================================================
import type { ConfidenceUnified, Opportunity } from "../types";

export const CONFIDENCE_WEIGHTS: Record<ConfidenceUnified, number> = {
  fixed: 1,
  S: 0.9,
  A: 0.7,
  B: 0.5,
  C: 0.3,
  D: 0.1,
};

export interface ExpectedRevenueBucket {
  /** YYYY-MM（成約予定月）。期間未定は "undecided" */
  key: string;
  amount: number;
  /** 手数料が入っている商品行数 */
  productCount: number;
}

export interface ExpectedRevenueResult {
  /** 成約予定日あり: 月別（昇順） */
  scheduled: ExpectedRevenueBucket[];
  scheduledTotal: number;
  /** 成約予定日なし（期間未定）の別枠 */
  undecided: ExpectedRevenueBucket;
  total: number;
  /** 初年度手数料が未入力で集計に入らなかった商品行数 */
  missingCommissionCount: number;
  /** 確度が未設定で重み 0 になった案件数 */
  missingConfidenceCount: number;
}

export function calcExpectedRevenue(
  opps: Opportunity[],
  ownerIds: string[],
): ExpectedRevenueResult {
  const months = new Map<string, ExpectedRevenueBucket>();
  const undecided: ExpectedRevenueBucket = { key: "undecided", amount: 0, productCount: 0 };
  let missingCommissionCount = 0;
  let missingConfidenceCount = 0;

  for (const o of opps) {
    if (!ownerIds.includes(o.ownerId)) continue;
    if (o.status !== "open" || o.stage === "lost" || o.stage === "issued") continue;
    const products = o.proposalProducts ?? [];
    if (products.length === 0) continue;
    const weight = o.confidence ? CONFIDENCE_WEIGHTS[o.confidence] : 0;
    if (!o.confidence) missingConfidenceCount++;
    const month = o.expectedCloseDate ? o.expectedCloseDate.slice(0, 7) : undefined;
    for (const p of products) {
      if (p.firstYearCommission === undefined || p.firstYearCommission === null) {
        missingCommissionCount++;
        continue;
      }
      const amount = Math.round(p.firstYearCommission * weight);
      if (!month) {
        undecided.amount += amount;
        undecided.productCount++;
        continue;
      }
      const b = months.get(month) ?? { key: month, amount: 0, productCount: 0 };
      b.amount += amount;
      b.productCount++;
      months.set(month, b);
    }
  }
  const scheduled = [...months.values()].sort((a, b) => a.key.localeCompare(b.key));
  const scheduledTotal = scheduled.reduce((s, b) => s + b.amount, 0);
  return {
    scheduled,
    scheduledTotal,
    undecided,
    total: scheduledTotal + undecided.amount,
    missingCommissionCount,
    missingConfidenceCount,
  };
}
