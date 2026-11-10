// =====================================================
// salesPerfMetricsS6.ts — S6: ライフプラン実績
// =====================================================

import type {
  SalesContract,
  SalesPerfFilter,
  SalesPerfMasters,
} from "../types";
import { FISCAL_MONTH_LABELS } from "../constants";
import { getScopeUserIds } from "./salePerfScope";
import { applyFilter } from "./salesPerfMetricsCore";

export interface LifePlanRow {
  channel: string;
  month: number;
  label: string;
  actual: number;
  target: number;
}

export function lifePlanMetrics(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
  lpTargetPerMonth: number,
): LifePlanRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(
    contracts,
    { ...filter, line: "life" },
    scopeIds,
  );
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const channelSet = new Set(filtered.map((c) => c.channel));
  const rows: LifePlanRow[] = [];

  for (const channel of channelSet) {
    for (const m of months) {
      const actual = filtered.filter(
        (c) => c.channel === channel && c.month === m && c.hadLifeplan,
      ).length;
      rows.push({
        channel,
        month: m,
        label: FISCAL_MONTH_LABELS[m],
        actual,
        target: lpTargetPerMonth,
      });
    }
  }
  return rows;
}
