// =====================================================
// opportunityStageLogic.active.test.ts — ADR-B3 律速ロジック単体テスト
// §B3-2-3: isActiveOpp
// §B3-3-4: representativeOpp / householdActiveOpps
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import {
  isActiveOpp,
  householdActiveOpps,
  representativeOpp,
} from "../utils/opportunityStage";

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

// ─── §B3-2-3. isActiveOpp ────────────────────────────────────────────────────────
describe("isActiveOpp", () => {
  it("status=open, stage=proposal → true", () => {
    const opp = mkOpp({
      id: "a1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
    });
    expect(isActiveOpp(opp)).toBe(true);
  });

  it("status=on_hold → true（保留中もアクティブ）", () => {
    const opp = mkOpp({
      id: "a2",
      householdId: "c1",
      stage: "proposal",
      status: "on_hold",
      proposalProducts: [],
    });
    expect(isActiveOpp(opp)).toBe(true);
  });

  it("status=won → false", () => {
    const opp = mkOpp({
      id: "a3",
      householdId: "c1",
      stage: "issued",
      status: "won",
      proposalProducts: [],
    });
    expect(isActiveOpp(opp)).toBe(false);
  });

  it("status=lost → false", () => {
    const opp = mkOpp({
      id: "a4",
      householdId: "c1",
      stage: "lost",
      status: "lost",
      proposalProducts: [],
    });
    expect(isActiveOpp(opp)).toBe(false);
  });

  it("stage=lost, status=open → false（ステージ判定が優先）", () => {
    const opp = mkOpp({
      id: "a5",
      householdId: "c1",
      stage: "lost",
      status: "open",
      proposalProducts: [],
    });
    expect(isActiveOpp(opp)).toBe(false);
  });

  it("effectiveStage=issued でも isActiveOpp=false", () => {
    const opp = mkOpp({
      id: "a6",
      householdId: "c1",
      stage: "issued",
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
          stage: "issued",
        },
      ],
    });
    expect(isActiveOpp(opp)).toBe(false);
  });
});

// ─── §B3-3-4. representativeOpp ──────────────────────────────────────────────────
describe("representativeOpp", () => {
  it("空配列 → null", () => {
    expect(representativeOpp([])).toBeNull();
  });

  it("1件 → その案件を返す", () => {
    const opp = mkOpp({
      id: "rep1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
    });
    expect(representativeOpp([opp])).toBe(opp);
  });

  it("最も進んだ案件（FUNNEL_ORDER 後方）を選ぶ", () => {
    const oppA = mkOpp({
      id: "repA",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
      updatedAt: "2026-08-01T00:00:00Z",
    });
    const oppB = mkOpp({
      id: "repB",
      householdId: "c1",
      stage: "application",
      status: "open",
      proposalProducts: [],
      updatedAt: "2026-07-01T00:00:00Z",
    });
    // oppB(application) のほうが进んでいる → oppB を返す
    expect(representativeOpp([oppA, oppB])).toBe(oppB);
  });

  it("同じステージなら updatedAt が新しい方を返す", () => {
    const oppA = mkOpp({
      id: "repA2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
      updatedAt: "2026-07-01T00:00:00Z",
    });
    const oppB = mkOpp({
      id: "repB2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
      updatedAt: "2026-08-01T00:00:00Z",
    });
    expect(representativeOpp([oppA, oppB])).toBe(oppB);
  });

  it("律速ステージ（effectiveStage）で比較する", () => {
    // oppA: Opportunity.stage=application だが商品が fact_finding → effectiveStage=fact_finding
    const oppA = mkOpp({
      id: "repA3",
      householdId: "c1",
      stage: "application",
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
          stage: "fact_finding",
        },
      ],
      updatedAt: "2026-08-01T00:00:00Z",
    });
    // oppB: stage=proposal, 商品なし → effectiveStage=proposal
    const oppB = mkOpp({
      id: "repB3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
      updatedAt: "2026-07-01T00:00:00Z",
    });
    // oppB(proposal) > oppA(fact_finding) → oppB が代表
    expect(representativeOpp([oppA, oppB])).toBe(oppB);
  });
});

// ─── §B3-3-4. householdActiveOpps ────────────────────────────────────────────────
describe("householdActiveOpps", () => {
  it("同世帯のアクティブ案件のみ返す", () => {
    const opps = [
      mkOpp({
        id: "h1",
        householdId: "c1",
        stage: "proposal",
        status: "open",
        proposalProducts: [],
      }),
      mkOpp({
        id: "h2",
        householdId: "c1",
        stage: "lost",
        status: "lost",
        proposalProducts: [],
      }),
      mkOpp({
        id: "h3",
        householdId: "c2",
        stage: "proposal",
        status: "open",
        proposalProducts: [],
      }),
    ];
    const result = householdActiveOpps(opps, "c1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h1");
  });

  it("別世帯は除外される", () => {
    const opps = [
      mkOpp({
        id: "h4",
        householdId: "c2",
        stage: "proposal",
        status: "open",
        proposalProducts: [],
      }),
    ];
    const result = householdActiveOpps(opps, "c1");
    expect(result).toHaveLength(0);
  });
});
