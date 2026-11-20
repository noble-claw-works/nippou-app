// =====================================================
// opportunityStageLogic.core.test.ts — ADR-B3 律速ロジック単体テスト
// §B3-3: effectiveStage / isRagged
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import {
  effectiveStage,
  isRagged,
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

// ─── §B3-3-1. effectiveStage ─────────────────────────────────────────────────────
describe("effectiveStage", () => {
  it("商品個別ステージなし → Opportunity.stage をそのまま返す", () => {
    const opp = mkOpp({
      id: "o1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
    });
    expect(effectiveStage(opp)).toBe("proposal");
  });

  it("全商品が同一ステージ → そのステージを返す", () => {
    const opp = mkOpp({
      id: "o2",
      householdId: "c1",
      stage: "negotiation",
      status: "open",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 1000,
          memo: "",
          stage: "negotiation",
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "B",
          insurer: "Y",
          insuredPersonId: "p1",
          monthlyPremium: 2000,
          memo: "",
          stage: "negotiation",
        },
      ],
    });
    expect(effectiveStage(opp)).toBe("negotiation");
  });

  it("商品ステージが案件ステージより手前 → 手前（律速）に引き戻される", () => {
    // 案件=proposal、商品1=proposal、商品2=fact_finding → fact_findingに律速
    const opp = mkOpp({
      id: "o3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 1000,
          memo: "",
          stage: "proposal",
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "B",
          insurer: "Y",
          insuredPersonId: "p1",
          monthlyPremium: 2000,
          memo: "",
          stage: "fact_finding",
        },
      ],
    });
    expect(effectiveStage(opp)).toBe("fact_finding");
  });

  it("商品ステージが案件ステージより先に進んでいても案件ステージで律速", () => {
    // 案件=proposal、商品1=application → proposal に律速（案件が手前）
    const opp = mkOpp({
      id: "o4",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "auto",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 5000,
          memo: "",
          stage: "application",
        },
      ],
    });
    expect(effectiveStage(opp)).toBe("proposal");
  });

  it("stage=lost は即 lost を返す（funnel外・商品ステージ無視）", () => {
    const opp = mkOpp({
      id: "o5",
      householdId: "c1",
      stage: "lost",
      status: "lost",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 1000,
          memo: "",
          stage: "proposal",
        },
      ],
    });
    expect(effectiveStage(opp)).toBe("lost");
  });

  it("stage=issued は即 issued を返す", () => {
    const opp = mkOpp({
      id: "o6",
      householdId: "c1",
      stage: "issued",
      status: "won",
      proposalProducts: [],
    });
    expect(effectiveStage(opp)).toBe("issued");
  });

  it("FUNNEL_ORDER の順序が正しいこと（approach=0, issued=7）", () => {
    expect(FUNNEL_ORDER.indexOf("approach")).toBe(0);
    expect(FUNNEL_ORDER.indexOf("issued")).toBe(7);
  });
});

// ─── §B3-3-2. isRagged ──────────────────────────────────────────────────────────
describe("isRagged", () => {
  it("商品なし → false（不揃いになりようがない）", () => {
    const opp = mkOpp({
      id: "r1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
    });
    expect(isRagged(opp)).toBe(false);
  });

  it("商品1件 → false", () => {
    const opp = mkOpp({
      id: "r2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 1000,
          memo: "",
          stage: "proposal",
        },
      ],
    });
    expect(isRagged(opp)).toBe(false);
  });

  it("商品2件・ステージ異なる → true", () => {
    const opp = mkOpp({
      id: "r3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 1000,
          memo: "",
          stage: "proposal",
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "B",
          insurer: "Y",
          insuredPersonId: "p1",
          monthlyPremium: 2000,
          memo: "",
          stage: "negotiation",
        },
      ],
    });
    expect(isRagged(opp)).toBe(true);
  });

  it("商品2件・ステージ同じ・applicationDate の有無混在 → true", () => {
    const opp = mkOpp({
      id: "r4",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 1000,
          memo: "",
          stage: "proposal",
          milestones: {
            firstConsultDate: "2026-07-01",
            proposalDate: "2026-08-01",
            applicationDate: "2026-09-01",
          },
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "B",
          insurer: "Y",
          insuredPersonId: "p1",
          monthlyPremium: 2000,
          memo: "",
          stage: "proposal",
          milestones: {
            firstConsultDate: "2026-07-01",
            proposalDate: "2026-08-01",
          }, // applicationDate なし
        },
      ],
    });
    expect(isRagged(opp)).toBe(true);
  });

  it("商品2件・ステージ同じ・全日付が揃っている → false", () => {
    const opp = mkOpp({
      id: "r5",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [
        {
          id: "pp1",
          productCategory: "life",
          productName: "A",
          insurer: "X",
          insuredPersonId: "p1",
          monthlyPremium: 1000,
          memo: "",
          stage: "proposal",
          milestones: {
            firstConsultDate: "2026-07-01",
            proposalDate: "2026-08-01",
          },
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "B",
          insurer: "Y",
          insuredPersonId: "p1",
          monthlyPremium: 2000,
          memo: "",
          stage: "proposal",
          milestones: {
            firstConsultDate: "2026-07-01",
            proposalDate: "2026-08-01",
          },
        },
      ],
    });
    expect(isRagged(opp)).toBe(false);
  });

  it("opp_demo1 (ADR-B3デモ) は isRagged=true（applicationDate が商品間で不揃い）", () => {
    const demo = OPPORTUNITIES.find((o) => o.id === "opp_demo1");
    expect(demo).toBeDefined();
    expect(isRagged(demo!)).toBe(true);
  });
});
