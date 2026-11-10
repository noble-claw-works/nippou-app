// =====================================================
// salesPerfMetricsS2.ts — S2: 予算・目標 + 累計コンボ
// =====================================================

import type {
  SalesContract,
  SalesTargetRow,
  SalesPerfFilter,
  SalesPerfMasters,
} from "../types";
import { fiscalMonthToCalMonth, FISCAL_MONTH_LABELS } from "../constants";
import { getScopeUserIds } from "./salePerfScope";
import {
  applyFilter,
  isInScenario,
  sumTargets,
  safeDiv,
  validCommission,
} from "./salesPerfMetricsCore";

export interface BudgetTableRow {
  month: number;
  label: string;
  calMonth: string;
  actual: number;
  actual_s: number;
  actual_s_a: number;
  budget: number;
  cumBudget: number;
  progressRate: number | null;
}

export function budgetTable(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): BudgetTableRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  let cumBudget = 0;

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
    const mc = filtered.filter((c) => c.month === m);
    const actual = mc
      .filter((c) => c.confidenceAgg === "fixed")
      .reduce((s, c) => s + validCommission(c), 0);
    const actual_s = mc
      .filter(
        (c) => c.confidenceAgg === "fixed" || c.confidenceAgg === "fixed_s",
      )
      .reduce((s, c) => s + validCommission(c), 0);
    const actual_s_a = mc.reduce((s, c) => s + validCommission(c), 0);
    const budget = sumTargets(
      targets,
      { ...filter, periodMode: "single", singleMonth: m },
      "all",
      "ALL",
      [m],
    );
    cumBudget += budget;
    const progressRate = safeDiv(actual * 100, cumBudget);
    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);
    return {
      month: m,
      label: FISCAL_MONTH_LABELS[m],
      calMonth: `${cy}-${String(cm).padStart(2, "0")}`,
      actual,
      actual_s,
      actual_s_a,
      budget,
      cumBudget,
      progressRate,
    };
  });
}

/**
 * S2専用: 累計予算 vs 確定累計 + 月次差額バーデータ
 */
export interface CumulativeComboPoint {
  month: number; // 会計月 1-12
  label: string; // '4月' 等
  calMonth: string; // 'YYYY-MM'
  monthlyActual: number; // 月次実績
  monthlyBudget: number; // 月次予算
  cumActual: number; // 確定累計
  cumBudget: number; // 予算積上げ累計
  gap: number; // 月次差額 (実績 − 予算)
  cumGap: number; // 累計差額 (実績累計 − 予算累計)
}

export function cumulativeBudgetVsActual(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): CumulativeComboPoint[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  let cumActual = 0;
  let cumBudget = 0;

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
    const monthContracts = filtered.filter(
      (c) => c.month === m && isInScenario(c, filter.confidenceScenario),
    );
    const monthlyActual = monthContracts.reduce(
      (s, c) => s + validCommission(c),
      0,
    );
    const monthlyBudget = sumTargets(
      targets,
      { ...filter, periodMode: "single", singleMonth: m },
      "all",
      "ALL",
      [m],
    );

    cumActual += monthlyActual;
    cumBudget += monthlyBudget;

    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);

    return {
      month: m,
      label: FISCAL_MONTH_LABELS[m],
      calMonth: `${cy}-${String(cm).padStart(2, "0")}`,
      monthlyActual,
      monthlyBudget,
      cumActual,
      cumBudget,
      gap: monthlyActual - monthlyBudget,
      cumGap: cumActual - cumBudget,
    };
  });
}
