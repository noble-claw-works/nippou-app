// =====================================================
// salesPerfMetricsS5.ts — S5: 保険会社・種目クロス集計
// =====================================================

import type {
  SalesContract,
  SalesPerfFilter,
  SalesPerfMasters,
} from "../types";
import { getScopeUserIds } from "./salePerfScope";
import {
  applyFilter,
  isInScenario,
  validCommission,
} from "./salesPerfMetricsCore";

/** 単軸集計行 (保険会社単体 or 種目単体) */
export interface InsurerTypeRow {
  key: string;
  commission: number;
  count: number;
}

/**
 * 保険会社×種目 クロス集計行
 */
export interface InsurerTypeCrossRow {
  insurer: string; // 保険会社名
  commission: number; // 保険会社合計手数料
  count: number; // 保険会社合計件数
  productTypes: InsurerTypeRow[]; // 種目別内訳
}

/**
 * S5専用: 保険会社×種目 クロス集計。
 * mode='commission' → 手数料合計で表示・ソート
 * mode='count'      → 件数で表示・ソート
 */
export function insurerTypeBreakdown(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
  mode: "commission" | "count" = "commission",
): InsurerTypeCrossRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds).filter((c) =>
    isInScenario(c, filter.confidenceScenario),
  );

  // 保険会社 → 種目 → { commission, count } の2段 Map
  const crossMap = new Map<
    string,
    Map<string, { commission: number; count: number }>
  >();

  for (const c of filtered) {
    const ins = c.insurer || "未分類";
    const pt = c.productType || "未分類";

    if (!crossMap.has(ins)) {
      crossMap.set(ins, new Map());
    }
    const ptMap = crossMap.get(ins)!;
    const existing = ptMap.get(pt) ?? { commission: 0, count: 0 };
    ptMap.set(pt, {
      commission: existing.commission + validCommission(c),
      count: existing.count + 1,
    });
  }

  const rows: InsurerTypeCrossRow[] = [];

  for (const [insurer, ptMap] of crossMap.entries()) {
    const productTypes: InsurerTypeRow[] = [...ptMap.entries()]
      .map(([key, v]) => ({ key, commission: v.commission, count: v.count }))
      .sort((a, b) =>
        mode === "commission" ? b.commission - a.commission : b.count - a.count,
      );

    const totalCommission = productTypes.reduce((s, r) => s + r.commission, 0);
    const totalCount = productTypes.reduce((s, r) => s + r.count, 0);

    rows.push({
      insurer,
      commission: totalCommission,
      count: totalCount,
      productTypes,
    });
  }

  rows.sort((a, b) =>
    mode === "commission" ? b.commission - a.commission : b.count - a.count,
  );

  return rows;
}
