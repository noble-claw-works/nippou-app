// =====================================================
// opportunityStageb4.contractDate.test.ts
// ADR-B4 v2 ステージ導出テスト — contractDate 新設 / isRagged / seed 実値確認
//   contractDate 追加後の境界（契約/契約予定 分離）
//   isRagged（contractDate を含む不揃い判定）
//   seed 実値確認（ADR-B4 v2 タブ語彙）
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import {
  isRagged,
  tabOf,
  TAB_META,
  FUNNEL_ORDER,
} from "../utils/opportunityStage";
import { OPPORTUNITIES } from "../data/seed";

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

// ─── contractDate 追加後の境界テスト（契約 vs 契約予定 の分離） ─────────────────
describe("contractDate 新設（ADR-B4 v2 B4-2-1）", () => {
  it("applicationDate あり・contractDate なし → contract_pending（契約予定タブ）", () => {
    const opp = mkOpp({
      id: "cd1",
      householdId: "c1",
      stage: "application",
      status: "open",
      milestones: {
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        // contractDate なし
      },
    });
    expect(tabOf(opp)).toBe("contract_pending");
  });

  it("contractDate あり・applicationDate なし → contract（契約タブ）", () => {
    // 契約予定日なしでも契約日があれば契約タブ
    const opp = mkOpp({
      id: "cd2",
      householdId: "c1",
      stage: "underwriting",
      status: "open",
      milestones: {
        proposalDate: "2026-07-20",
        contractDate: "2026-08-10",
      },
    });
    expect(tabOf(opp)).toBe("contract");
  });

  it("applicationDate と contractDate 両方あり → contract（contractDate が優先）", () => {
    const opp = mkOpp({
      id: "cd3",
      householdId: "c1",
      stage: "underwriting",
      status: "open",
      milestones: {
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
      },
    });
    expect(tabOf(opp)).toBe("contract");
  });
});

// ─── isRagged（contractDate 追加後） ─────────────────────────────────────────────
describe("isRagged（contractDate を含む不揃い判定）", () => {
  it("商品間で contractDate の有無が混在 → true（⚠️）", () => {
    const opp = mkOpp({
      id: "rg1",
      householdId: "c1",
      stage: "underwriting",
      status: "open",
      milestones: {
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
      },
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "生命保険",
          insurer: "A",
          insuredPersonId: "p1",
          monthlyPremium: 10000,
          memo: "",
          milestones: {
            proposalDate: "2026-07-20",
            applicationDate: "2026-08-01",
            contractDate: "2026-08-10",
          },
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "医療保険",
          insurer: "B",
          insuredPersonId: "p1",
          monthlyPremium: 5000,
          memo: "",
          milestones: {
            proposalDate: "2026-07-20",
            applicationDate: "2026-08-01",
            // contractDate なし
          },
        },
      ],
    });
    expect(isRagged(opp)).toBe(true);
  });

  it("全商品で contractDate が揃っている → false（⚠️なし）", () => {
    const opp = mkOpp({
      id: "rg2",
      householdId: "c1",
      stage: "underwriting",
      status: "open",
      milestones: {
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
      },
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "生命保険",
          insurer: "A",
          insuredPersonId: "p1",
          monthlyPremium: 10000,
          memo: "",
          milestones: {
            proposalDate: "2026-07-20",
            applicationDate: "2026-08-01",
            contractDate: "2026-08-10",
          },
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "医療保険",
          insurer: "B",
          insuredPersonId: "p1",
          monthlyPremium: 5000,
          memo: "",
          milestones: {
            proposalDate: "2026-07-20",
            applicationDate: "2026-08-01",
            contractDate: "2026-08-10",
          },
        },
      ],
    });
    expect(isRagged(opp)).toBe(false);
  });
});

// ─── seed 実値確認（ADR-B4 v2 タブ語彙） ────────────────────────────────────────
describe("seed 実値 — ADR-B4 v2 タブ語彙確認", () => {
  it('opp1(proposalDate あり) → "proposed"', () => {
    const opp1 = OPPORTUNITIES.find((o) => o.id === "opp1");
    expect(opp1).toBeDefined();
    expect(tabOf(opp1!)).toBe("proposed");
  });

  it('opp3(applicationDate あり) → "contract_pending"', () => {
    const opp3 = OPPORTUNITIES.find((o) => o.id === "opp3");
    expect(opp3).toBeDefined();
    expect(tabOf(opp3!)).toBe("contract_pending");
  });

  it('opp7(issued/won) → "issued"', () => {
    const opp7 = OPPORTUNITIES.find((o) => o.id === "opp7");
    expect(opp7).toBeDefined();
    expect(tabOf(opp7!)).toBe("issued");
  });

  it('opp8(lost) → "lost"', () => {
    const opp8 = OPPORTUNITIES.find((o) => o.id === "opp8");
    expect(opp8).toBeDefined();
    expect(tabOf(opp8!)).toBe("lost");
  });

  it('opp9(underwriting) → "contract"', () => {
    const opp9 = OPPORTUNITIES.find((o) => o.id === "opp9");
    expect(opp9).toBeDefined();
    expect(tabOf(opp9!)).toBe("contract");
  });

  it('opp_demo1 → "proposed"（proposalDate あり・複数商品）', () => {
    const demo = OPPORTUNITIES.find((o) => o.id === "opp_demo1");
    expect(demo).toBeDefined();
    expect(tabOf(demo!)).toBe("proposed");
  });

  it("全タブ件数で first_consult / lifeplan タブが新語彙に対応していること", () => {
    const keys = TAB_META.map((t) => t.key);
    // first_consult, lifeplan に分類される案件が 0 件以上（語彙として機能している）
    const fcOpps = OPPORTUNITIES.filter(
      (o) => o.status !== "won" && tabOf(o) === "first_consult",
    );
    const lpOpps = OPPORTUNITIES.filter(
      (o) => o.status !== "won" && tabOf(o) === "lifeplan",
    );
    expect(keys).toContain("first_consult");
    expect(keys).toContain("lifeplan");
    // どちらか一方以上の案件が存在すること（seed に firstConsultDate/lifePlanDate 持つ案件がある）
    expect(fcOpps.length + lpOpps.length).toBeGreaterThan(0);
  });

  it("FUNNEL_ORDER の order は B4 v2 後も不変（9段 enum は温存）", () => {
    expect(FUNNEL_ORDER).toHaveLength(8);
    expect(FUNNEL_ORDER[0]).toBe("approach");
    expect(FUNNEL_ORDER[7]).toBe("issued");
  });
});
