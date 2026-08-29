// =====================================================
// opportunityStageb4.tabOf.test.ts
// ADR-B4 v2 ステージ導出テスト — tabOf（7タブ確定真理値表）
//   §B4-3-3 tabOf（7タブ・日付駆動版）
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import { isRagged, tabOf } from "../utils/opportunityStage";

// ─── ヘルパー: Opportunity モック生成 ────────────────────────────────────────────
const _now = new Date().toISOString();

function mkOpp(
  overrides: Partial<Opportunity> &
    Pick<Opportunity, "id" | "householdId" | "stage" | "status">,
): Opportunity {
  return {
    ownerId: "u1",
    title: "テスト案件",
    productCategories: ["life"],
    proposalProducts: [],
    targetPersonIds: [],
    needsAnalysisDone: false,
    illustrationProvided: false,
    stageHistory: [],
    tags: [],
    memo: "",
    createdAt: _now,
    updatedAt: _now,
    ...overrides,
  };
}

// ─── §B4-3-3. tabOf（7タブ・日付駆動・ADR-B4 v2 真理値表） ─────────────────────
describe("tabOf（ADR-B4 v2 7タブ確定真理値表）", () => {
  it("日付全て空・stage=approach → first_consult（新案件タブ廃止・最左へ）", () => {
    const opp = mkOpp({
      id: "tab1",
      householdId: "c1",
      stage: "approach",
      status: "open",
    });
    expect(tabOf(opp)).toBe("first_consult");
  });

  it("firstConsultDate のみ → first_consult", () => {
    const opp = mkOpp({
      id: "tab2",
      householdId: "c1",
      stage: "approach",
      status: "open",
      milestones: { firstConsultDate: "2026-07-01" },
    });
    expect(tabOf(opp)).toBe("first_consult");
  });

  it("lifePlanDate あり・proposalDate なし → lifeplan", () => {
    const opp = mkOpp({
      id: "tab3",
      householdId: "c1",
      stage: "needs_analysis",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        lifePlanDate: "2026-07-10",
      },
    });
    expect(tabOf(opp)).toBe("lifeplan");
  });

  it("proposalDate あり・applicationDate なし → proposed", () => {
    const opp = mkOpp({
      id: "tab4",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        lifePlanDate: "2026-07-10",
        proposalDate: "2026-07-20",
      },
    });
    expect(tabOf(opp)).toBe("proposed");
  });

  it("applicationDate あり・contractDate なし → contract_pending", () => {
    const opp = mkOpp({
      id: "tab5",
      householdId: "c1",
      stage: "application",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
      },
    });
    expect(tabOf(opp)).toBe("contract_pending");
  });

  it("contractDate あり・establishedDate なし → contract", () => {
    const opp = mkOpp({
      id: "tab6",
      householdId: "c1",
      stage: "underwriting",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
      },
    });
    expect(tabOf(opp)).toBe("contract");
  });

  it("establishedDate あり → issued", () => {
    const opp = mkOpp({
      id: "tab7",
      householdId: "c1",
      stage: "issued",
      status: "won",
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
        establishedDate: "2026-08-20",
      },
    });
    expect(tabOf(opp)).toBe("issued");
  });

  it("lostDate あり（最優先）→ lost", () => {
    const opp = mkOpp({
      id: "tab8",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-07-20",
        lostDate: "2026-07-25",
      },
    });
    expect(tabOf(opp)).toBe("lost");
  });

  it("stage=lost → lost（milestones.lostDate なしでも）", () => {
    const opp = mkOpp({
      id: "tab9",
      householdId: "c1",
      stage: "lost",
      status: "lost",
    });
    expect(tabOf(opp)).toBe("lost");
  });

  it("status=lost → lost", () => {
    const opp = mkOpp({
      id: "tab10",
      householdId: "c1",
      stage: "proposal",
      status: "lost",
    });
    expect(tabOf(opp)).toBe("lost");
  });

  it("proposals から latestProposalDate で提案判定 → proposed", () => {
    const opp = mkOpp({
      id: "tab11",
      householdId: "c1",
      stage: "approach",
      status: "open",
      milestones: { firstConsultDate: "2026-07-01" },
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-07-20",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    expect(tabOf(opp)).toBe("proposed");
  });

  it("proposals 2ラウンド・applicationDate なし → 最新提案日で proposed", () => {
    const opp = mkOpp({
      id: "tab12",
      householdId: "c1",
      stage: "approach",
      status: "open",
      milestones: { firstConsultDate: "2026-07-01" },
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-07-10",
          productIds: [],
          createdAt: _now,
        },
        {
          id: "r2",
          roundNo: 2,
          proposalDate: "2026-07-25",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    expect(tabOf(opp)).toBe("proposed");
  });

  it("律速で contract_pending になる（生命=contractDate/医療=applicationDate のみ）", () => {
    const opp = mkOpp({
      id: "tab13",
      householdId: "c1",
      stage: "underwriting",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
      },
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "生命保険",
          insurer: "A生命",
          insuredPersonId: "p1",
          monthlyPremium: 10000,
          memo: "",
          milestones: {
            firstConsultDate: "2026-07-01",
            proposalDate: "2026-07-20",
            applicationDate: "2026-08-01",
            contractDate: "2026-08-10",
          },
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "医療保険",
          insurer: "B生命",
          insuredPersonId: "p1",
          monthlyPremium: 5000,
          memo: "",
          milestones: {
            firstConsultDate: "2026-07-01",
            proposalDate: "2026-07-20",
            applicationDate: "2026-08-01",
            // contractDate なし → application まで
          },
        },
      ],
    });
    // 生命=underwriting(contractDate), 医療=application → application(contract_pending)に律速
    expect(tabOf(opp)).toBe("contract_pending");
    expect(isRagged(opp)).toBe(true); // contractDate が商品間で不揃い
  });
});
