// =====================================================
// salesPerfMetrics.ts — 薄いバレル (re-export のみ)
//
// 実体は各 salesPerfMetricsS*.ts / salesPerfMetricsCore.ts に分割済み。
// 既存の `import { ... } from '../lib/salesPerfMetrics'` はここを通し続ける。
// =====================================================

// 内部ユーティリティ (applyFilter は GlobalFilterBar / テストで直接使用)
export { applyFilter } from "./salesPerfMetricsCore";

// S1: KPI集計
export {
  kpiSummary,
  monthlyCommissionVsBudget,
  stackedByConfidence,
  ownerRanking,
} from "./salesPerfMetricsS1";

// S2: 予算・目標 + 累計コンボ
export type {
  BudgetTableRow,
  CumulativeComboPoint,
} from "./salesPerfMetricsS2";
export { budgetTable, cumulativeBudgetVsActual } from "./salesPerfMetricsS2";

// S3: プロセス
export type { OwnerFunnelRow } from "./salesPerfMetricsS3";
export { funnelMetrics, ownerFunnelHeat } from "./salesPerfMetricsS3";

// S4: チャネル / 提携先
export type { ChannelRow, PartnerMonthlyRow } from "./salesPerfMetricsS4";
export {
  channelBreakdown,
  partnerMonthlyBreakdown,
} from "./salesPerfMetricsS4";

// S5: 保険会社・種目
export type { InsurerTypeRow, InsurerTypeCrossRow } from "./salesPerfMetricsS5";
export { insurerTypeBreakdown } from "./salesPerfMetricsS5";

// S6: ライフプラン
export type { LifePlanRow } from "./salesPerfMetricsS6";
export { lifePlanMetrics } from "./salesPerfMetricsS6";

// S7: 契約明細 + データ品質
export { contractRows, dataQuality } from "./salesPerfMetricsS7";
