// =====================================================
// salesPerfMetricsS4.ts — S4: チャネル / 提携先分析
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
  safeDiv,
  validCommission,
} from "./salesPerfMetricsCore";

export interface ChannelRow {
  channel: string;
  count: number;
  commission: number;
  share: number | null;
}

export function channelBreakdown(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): ChannelRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds).filter((c) =>
    isInScenario(c, filter.confidenceScenario),
  );

  const map = new Map<string, { count: number; commission: number }>();
  for (const c of filtered) {
    const existing = map.get(c.channel) ?? { count: 0, commission: 0 };
    map.set(c.channel, {
      count: existing.count + 1,
      commission: existing.commission + validCommission(c),
    });
  }

  const totalCommission = [...map.values()].reduce(
    (s, v) => s + v.commission,
    0,
  );
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      count: v.count,
      commission: v.commission,
      share: safeDiv(v.commission * 100, totalCommission),
    }))
    .sort((a, b) => b.commission - a.commission);
}

// ----------------------------------------
// S4追加: 提携先別月次件数テーブル
// ----------------------------------------

export interface PartnerMonthlyRow {
  partner: string;
  /** 会計月(1-12)→件数 */
  monthly: Record<number, number>;
  total: number;
  /** 全体合計に対する構成比 (null=分母0) */
  share: number | null;
}

/**
 * 提携先(partner)別 × 月次 件数テーブル用データ。
 * 分母0 → share=null。
 */
export function partnerMonthlyBreakdown(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): PartnerMonthlyRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds).filter((c) =>
    isInScenario(c, filter.confidenceScenario),
  );

  // partner → month → count
  const map = new Map<string, Record<number, number>>();
  for (const c of filtered) {
    if (!map.has(c.partner)) map.set(c.partner, {});
    const rec = map.get(c.partner)!;
    const m = c.month ?? 0; // month null は 0 bucket (未計上)
    rec[m] = (rec[m] ?? 0) + 1;
  }

  const totalCount = filtered.length;
  return [...map.entries()]
    .map(([partner, monthly]) => {
      const total = Object.values(monthly).reduce((s, v) => s + v, 0);
      return {
        partner,
        monthly,
        total,
        share: safeDiv(total * 100, totalCount),
      };
    })
    .sort((a, b) => b.total - a.total);
}
