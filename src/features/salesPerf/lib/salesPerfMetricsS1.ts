// =====================================================
// salesPerfMetricsS1.ts — T0-4: KPI集計 (S1)
// =====================================================

import type {
  SalesContract,
  SalesTargetRow,
  SalesPerfFilter,
  SalesPerfMasters,
  KpiSummary,
  MonthlyPoint,
  ConfidenceStackPoint,
  OwnerRankRow,
} from "../types";
import { fiscalMonthToCalMonth } from "../constants";
import { getScopeUserIds, ownerName } from "./salePerfScope";
import {
  applyFilter,
  isInScenario,
  sumTargets,
  safeDiv,
  validCommission,
} from "./salesPerfMetricsCore";

/**
 * KPIサマリー: 年間予算/確定手数料/進捗率/目標差額/前年比
 */
export function kpiSummary(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): KpiSummary {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  // 確度シナリオ内の確定分
  const inScenario = filtered.filter((c) =>
    isInScenario(c, filter.confidenceScenario),
  );
  const confirmedCommission = inScenario.reduce(
    (s, c) => s + validCommission(c),
    0,
  );

  // 予算積上げ (scope=all で全体)
  const annualBudget = sumTargets(targets, filter, "all", "ALL");

  const progressRate = safeDiv(confirmedCommission * 100, annualBudget);
  const budgetGap = confirmedCommission - annualBudget;

  // 前年比
  const prevFilter: SalesPerfFilter = {
    ...filter,
    fiscalYear: filter.fiscalYear - 1,
  };
  const prevContracts = contracts.filter(
    (c) => c.fiscalYear === filter.fiscalYear - 1,
  );
  const prevFiltered = applyFilter(prevContracts, prevFilter, scopeIds);
  const prevInScenario = prevFiltered.filter((c) =>
    isInScenario(c, filter.confidenceScenario),
  );
  const prevCommission = prevInScenario.reduce(
    (s, c) => s + validCommission(c),
    0,
  );
  const yoyRate = safeDiv(confirmedCommission * 100, prevCommission);

  return {
    annualBudget,
    confirmedCommission,
    progressRate,
    budgetGap,
    yoyRate,
  };
}

/**
 * 月次手数料 vs 予算
 */
export function monthlyCommissionVsBudget(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): MonthlyPoint[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  let cumActual = 0;
  let cumBudget = 0;

  return months.map((m) => {
    const monthContracts = filtered.filter(
      (c) => c.month === m && isInScenario(c, filter.confidenceScenario),
    );
    const actual = monthContracts.reduce((s, c) => s + validCommission(c), 0);
    const budget = sumTargets(
      targets,
      { ...filter, periodMode: "single", singleMonth: m },
      "all",
      "ALL",
      [m],
    );
    cumActual += actual;
    cumBudget += budget;

    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);
    return {
      month: m,
      calMonth: `${cy}-${String(cm).padStart(2, "0")}`,
      actual,
      budget,
      cumActual,
      cumBudget,
    };
  });
}

/**
 * 確度別積上げ棒グラフデータ (月次)
 */
export function stackedByConfidence(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): ConfidenceStackPoint[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return months.map((m) => {
    const mc = filtered.filter((c) => c.month === m);
    const sum = (code: string) =>
      mc
        .filter((c) => c.confidenceCode === code)
        .reduce((s, c) => s + validCommission(c), 0);
    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);
    return {
      month: m,
      calMonth: `${cy}-${String(cm).padStart(2, "0")}`,
      fixed: sum("fixed"),
      S: sum("S"),
      A: sum("A"),
      B: sum("B"),
      C: sum("C"),
      D: sum("D"),
      first: sum("first"),
    };
  });
}

/**
 * 担当者進捗ランキング
 */
export function ownerRanking(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): OwnerRankRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  return scopeIds
    .map((uid) => {
      const ownerContracts = filtered.filter(
        (c) => c.ownerId === uid && isInScenario(c, filter.confidenceScenario),
      );
      const commission = ownerContracts.reduce(
        (s, c) => s + validCommission(c),
        0,
      );
      const budget = sumTargets(targets, filter, "individual", uid);
      const progressRate = safeDiv(commission * 100, budget);
      return {
        ownerId: uid,
        ownerName: ownerName(uid, masters),
        commission,
        budget,
        progressRate,
      };
    })
    .sort((a, b) => (b.progressRate ?? -1) - (a.progressRate ?? -1));
}
