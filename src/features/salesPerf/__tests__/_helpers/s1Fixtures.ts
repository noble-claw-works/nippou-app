// _helpers/s1Fixtures.ts — S1 テスト共通フィクスチャ
import type {
  SalesContract,
  SalesTargetRow,
  SalesPerfFilter,
  SalesPerfMasters,
} from "../../types";

export const defaultFilter: SalesPerfFilter = {
  line: "both",
  fiscalYear: 2025,
  periodMode: "full",
  confidenceScenario: "fixed",
};

export const masters: SalesPerfMasters = {
  users: [
    { id: "u1", name: "霧島 遥", groupId: "g1", role: "general" },
    { id: "u2", name: "佐倉 涼", groupId: "g1", role: "general" },
    { id: "u3", name: "東雲 蓮", groupId: "g2", role: "manager" },
  ],
  groups: [
    { id: "g1", name: "G1", memberIds: ["u1", "u2"], managerIds: ["u3"] },
    { id: "g2", name: "G2", memberIds: ["u3"], managerIds: ["u3"] },
  ],
  insurers: [],
  productTypes: [],
  channels: [],
};

export function makeContract(
  overrides: Partial<SalesContract> = {},
): SalesContract {
  return {
    id: "c1",
    line: "life",
    fiscalYear: 2025,
    ownerId: "u1",
    groupId: "g1",
    channel: "紹介",
    partner: "直接",
    insurer: "第一生命",
    productType: "終身保険",
    monthlyPremium: 30000,
    firstYearCommission: 200000,
    confidenceCode: "fixed",
    confidenceAgg: "fixed",
    establishedDate: "2025-07-10",
    month: 4,
    hadMeeting: true,
    hadLifeplan: true,
    policyCollected: true,
    hadProposal: true,
    householdId: "hh_001",
    _issues: [],
    ...overrides,
  };
}

export function makeTarget(
  overrides: Partial<SalesTargetRow> = {},
): SalesTargetRow {
  return {
    line: "life",
    fiscalYear: 2025,
    scopeType: "all",
    scopeId: "ALL",
    month: 1,
    amount: 500000,
    ...overrides,
  };
}
