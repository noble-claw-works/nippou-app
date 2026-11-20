// =====================================================
// salesPerfMetricsS3.ts — S3: プロセス / ファネル
// =====================================================

import type {
  SalesContract,
  SalesPerfFilter,
  SalesPerfMasters,
  FunnelMetrics,
} from "../types";
import { getScopeUserIds, ownerName } from "./salePerfScope";
import { applyFilter, safeDiv } from "./salesPerfMetricsCore";

/**
 * ファネル指標: 商談→LP→提案→証券回収→契約世帯→件数 + 転換率
 */
export function funnelMetrics(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): FunnelMetrics {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  const meetings = filtered.filter((c) => c.hadMeeting).length;
  const lifeplans = filtered.filter((c) => c.hadLifeplan).length;
  const proposals = filtered.filter((c) => c.hadProposal).length;
  const policyCollections = filtered.filter((c) => c.policyCollected).length;
  // 契約世帯数 (ユニーク household)
  const confirmedContracts = filtered.filter(
    (c) => c.confidenceCode === "fixed",
  );
  const contractHouseholds = new Set(
    confirmedContracts.map((c) => c.householdId),
  ).size;
  const contractCount = confirmedContracts.length;

  // 転換率
  const lpRate = safeDiv(lifeplans * 100, meetings);
  const proposalRate = safeDiv(proposals * 100, meetings);
  const contractRate = safeDiv(contractHouseholds * 100, proposals);
  const avgHouseholdValue = safeDiv(
    confirmedContracts.reduce((s, c) => s + (c.firstYearCommission ?? 0), 0),
    contractHouseholds,
  );

  return {
    meetings,
    lifeplans,
    proposals,
    policyCollections,
    contracts: contractHouseholds,
    contractCount,
    lpRate,
    proposalRate,
    contractRate,
    avgHouseholdValue,
  };
}

/**
 * 担当者比較ヒートテーブル用データ
 */
export interface OwnerFunnelRow {
  ownerId: string;
  ownerName: string;
  meetings: number;
  lifeplans: number;
  proposals: number;
  contracts: number;
  lpRate: number | null;
  contractRate: number | null;
}

export function ownerFunnelHeat(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: "general" | "manager" | "admin" | "executive",
  currentUserId: string,
): OwnerFunnelRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  return scopeIds.map((uid) => {
    const oc = filtered.filter((c) => c.ownerId === uid);
    const meetings = oc.filter((c) => c.hadMeeting).length;
    const lifeplans = oc.filter((c) => c.hadLifeplan).length;
    const proposals = oc.filter((c) => c.hadProposal).length;
    const contractHouseholds = new Set(
      oc.filter((c) => c.confidenceCode === "fixed").map((c) => c.householdId),
    ).size;
    return {
      ownerId: uid,
      ownerName: ownerName(uid, masters),
      meetings,
      lifeplans,
      proposals,
      contracts: contractHouseholds,
      lpRate: safeDiv(lifeplans * 100, meetings),
      contractRate: safeDiv(contractHouseholds * 100, proposals),
    };
  });
}
