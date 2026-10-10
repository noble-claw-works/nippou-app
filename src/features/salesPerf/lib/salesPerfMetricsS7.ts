// =====================================================
// salesPerfMetricsS7.ts — S7: 契約明細 + データ品質
// =====================================================

import type {
  SalesContract,
  SalesPerfFilter,
  SalesPerfMasters,
  DataQuality,
} from "../types";
import { getScopeUserIds } from "./salePerfScope";
import { applyFilter } from "./salesPerfMetricsCore";

export function contractRows(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): SalesContract[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  return applyFilter(contracts, filter, scopeIds);
}

export function dataQuality(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): DataQuality {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  return {
    total: filtered.length,
    needsReview: filtered.filter((c) => c._issues.length > 0).length,
  };
}
