// =====================================================
// salesPerfMetricsCore.ts — 内部ユーティリティ + applyFilter
// =====================================================

import type { SalesContract, SalesTargetRow, SalesPerfFilter } from "../types";
import { fiscalMonthRange } from "../constants";

// ----------------------------------------
// 内部ユーティリティ
// ----------------------------------------

/** 分母0ガード: 0除算を防ぐ。どちらかが null でも null */
export function safeDiv(
  numerator: number | null,
  denominator: number | null,
): number | null {
  if (numerator === null || denominator === null) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

/** 集計に使う firstYearCommission (null は除外) */
export function validCommission(c: SalesContract): number {
  return c.firstYearCommission ?? 0;
}

// ----------------------------------------
// フィルタ適用
// ----------------------------------------

/**
 * フィルタ + スコープを適用してコントラクト配列を絞り込む。
 * 対象 fiscalYear の contracts のみ返す。
 */
export function applyFilter(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  scopeUserIds: string[],
): SalesContract[] {
  const months = fiscalMonthRange(filter.periodMode, filter.singleMonth);

  return contracts.filter((c) => {
    // 会計年度
    if (c.fiscalYear !== filter.fiscalYear) return false;
    // スコープ (担当者)
    if (!scopeUserIds.includes(c.ownerId)) return false;
    // 商品ライン
    if (filter.line !== "both" && c.line !== filter.line) return false;
    // 保険会社
    if (filter.insurer && c.insurer !== filter.insurer) return false;
    // 種目
    if (filter.productType && c.productType !== filter.productType)
      return false;
    // チャネル
    if (filter.channel && c.channel !== filter.channel) return false;
    // 期間 (month が null の未計上は full/h1/h2 では含む。singleMonth は除外)
    if (filter.periodMode === "single") {
      if (c.month === null) return false;
      if (!months.includes(c.month)) return false;
    }
    return true;
  });
}

/** 確度シナリオでの確定コントラクト判定 */
export function isInScenario(
  c: SalesContract,
  scenario: SalesPerfFilter["confidenceScenario"],
): boolean {
  if (!c.confidenceAgg) return false;
  if (scenario === "fixed") return c.confidenceAgg === "fixed";
  if (scenario === "fixed_s")
    return c.confidenceAgg === "fixed" || c.confidenceAgg === "fixed_s";
  // fixed_s_a
  return true; // fixed / fixed_s / fixed_s_a すべて含む
}

/** ターゲット合計 */
export function sumTargets(
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  scopeType: "all" | "group" | "individual",
  scopeId: string,
  months?: number[],
): number {
  const mths =
    months ?? fiscalMonthRange(filter.periodMode, filter.singleMonth);
  return targets
    .filter(
      (t) =>
        t.fiscalYear === filter.fiscalYear &&
        (filter.line === "both" || t.line === filter.line) &&
        t.scopeType === scopeType &&
        t.scopeId === scopeId &&
        mths.includes(t.month),
    )
    .reduce((s, t) => s + t.amount, 0);
}
