// _helpers/s7Fixtures.ts — S7 テスト共通フィクスチャ
import type {
  SalesContract,
  SalesPerfFilter,
  SalesPerfMasters,
} from "../../types";

export const defaultFilter: SalesPerfFilter = {
  line: "both",
  fiscalYear: 2025,
  periodMode: "full",
  confidenceScenario: "fixed_s_a",
};

export const masters: SalesPerfMasters = {
  users: [
    { id: "u1", name: "霧島 遥", groupId: "g1", role: "general" },
    { id: "u2", name: "佐倉 涼", groupId: "g1", role: "general" },
    { id: "u3", name: "東雲 蓮", groupId: "g2", role: "manager" },
    { id: "u4", name: "天音 結衣", groupId: "g2", role: "general" },
  ],
  groups: [
    {
      id: "g1",
      name: "第一営業G",
      memberIds: ["u1", "u2"],
      managerIds: ["u3"],
    },
    {
      id: "g2",
      name: "第二営業G",
      memberIds: ["u3", "u4"],
      managerIds: ["u3"],
    },
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
