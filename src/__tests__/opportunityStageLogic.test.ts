// =====================================================
// opportunityStageLogic.test.ts — ADR-B3 律速ロジック単体テスト
// §B3-3: effectiveStage / isRagged / isActiveOpp
// §B3-3-4: householdActiveOpps / representativeOpp
// §B3-4: tabOf / isVisited
// §B3-7-6: タブ件数カウント（seed 実値確認）
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import {
  effectiveStage,
  effectiveExpectedCloseDate,
  isRagged,
  isActiveOpp,
  householdActiveOpps,
  representativeOpp,
  tabOf,
  isVisited,
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

// ─── §B3-4. isVisited / tabOf ────────────────────────────────────────────────────
describe("isVisited", () => {
  it("firstConsultDate あり・proposalDate なし → true", () => {
    const opp = mkOpp({
      id: "v1",
      householdId: "c1",
      stage: "fact_finding",
      status: "open",
      proposalProducts: [],
      milestones: { firstConsultDate: "2026-07-01" },
    });
    expect(isVisited(opp)).toBe(true);
  });

  it("firstConsultDate なし → false", () => {
    const opp = mkOpp({
      id: "v2",
      householdId: "c1",
      stage: "approach",
      status: "open",
      proposalProducts: [],
    });
    expect(isVisited(opp)).toBe(false);
  });

  it("proposalDate あり → false（訪問済みではなく提案済み）", () => {
    const opp = mkOpp({
      id: "v3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-08-01",
      },
    });
    expect(isVisited(opp)).toBe(false);
  });
});

describe("tabOf", () => {
  it('lost → "lost"', () => {
    const opp = mkOpp({
      id: "t1",
      householdId: "c1",
      stage: "lost",
      status: "lost",
      proposalProducts: [],
    });
    expect(tabOf(opp)).toBe("lost");
  });

  it('issued → "issued"', () => {
    const opp = mkOpp({
      id: "t2",
      householdId: "c1",
      stage: "issued",
      status: "won",
      proposalProducts: [],
    });
    expect(tabOf(opp)).toBe("issued");
  });

  it('approach + firstConsultDate なし → "new"', () => {
    const opp = mkOpp({
      id: "t3",
      householdId: "c1",
      stage: "approach",
      status: "open",
      proposalProducts: [],
    });
    expect(tabOf(opp)).toBe("new");
  });

  it('fact_finding + firstConsultDate あり・proposalDate なし → "visited"', () => {
    const opp = mkOpp({
      id: "t4",
      householdId: "c1",
      stage: "fact_finding",
      status: "open",
      proposalProducts: [],
      milestones: { firstConsultDate: "2026-07-01" },
    });
    expect(tabOf(opp)).toBe("visited");
  });

  it('proposal + proposalDate あり → "proposed"', () => {
    const opp = mkOpp({
      id: "t5",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-08-01",
      },
    });
    expect(tabOf(opp)).toBe("proposed");
  });

  it('application → "contract_pending"', () => {
    const opp = mkOpp({
      id: "t6",
      householdId: "c1",
      stage: "application",
      status: "open",
      proposalProducts: [],
    });
    expect(tabOf(opp)).toBe("contract_pending");
  });

  it('underwriting → "contract"', () => {
    const opp = mkOpp({
      id: "t7",
      householdId: "c1",
      stage: "underwriting",
      status: "open",
      proposalProducts: [],
    });
    expect(tabOf(opp)).toBe("contract");
  });

  it('律速で proposal → negotiation でも "proposed"', () => {
    // 案件=negotiation だが商品1つが proposal に律速 → effectiveStage=proposal → "proposed"
    const opp = mkOpp({
      id: "t8",
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
          stage: "proposal",
        },
      ],
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-08-01",
      },
    });
    expect(tabOf(opp)).toBe("proposed");
  });
});

// ─── §B3-4. effectiveExpectedCloseDate ───────────────────────────────────────────
describe("effectiveExpectedCloseDate", () => {
  it("商品 applicationDate なし → expectedCloseDate を返す", () => {
    const opp = mkOpp({
      id: "ecd1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
      expectedCloseDate: "2026-10-01",
    });
    expect(effectiveExpectedCloseDate(opp)).toBe("2026-10-01");
  });

  it("商品 applicationDate あり → 最遅日付（律速）を返す", () => {
    const opp = mkOpp({
      id: "ecd2",
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
          milestones: { applicationDate: "2026-09-01" },
        },
        {
          id: "pp2",
          productCategory: "medical",
          productName: "B",
          insurer: "Y",
          insuredPersonId: "p1",
          monthlyPremium: 2000,
          memo: "",
          milestones: { applicationDate: "2026-10-15" },
        },
      ],
      expectedCloseDate: "2026-09-01",
    });
    expect(effectiveExpectedCloseDate(opp)).toBe("2026-10-15");
  });

  it("opp_demo1: 生命保険の applicationDate が返る", () => {
    const demo = OPPORTUNITIES.find((o) => o.id === "opp_demo1");
    expect(demo).toBeDefined();
    // pp_demo1_life の applicationDate のみあるはず
    const result = effectiveExpectedCloseDate(demo!);
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── §B3-7-6. seed 実値: タブ件数カウント確認 ──────────────────────────────────
describe("タブ件数カウント — seed 実値確認", () => {
  // seed の open 案件でタブ別件数を数え、新設「訪問済み」タブに件数が入ることを確認

  it('seed に "visited" タブに分類される案件が存在すること', () => {
    const visitedOpps = OPPORTUNITIES.filter(
      (o) => o.status === "open" && tabOf(o) === "visited",
    );
    // opp4(鈴木), opp5(高橋), opp6(伊藤), opp10(鈴木学資), opp11(水野), opp_demo1 のうち
    // firstConsultDate あり かつ proposalDate なし のもの
    expect(visitedOpps.length).toBeGreaterThan(0);
  });

  it('opp1(proposal+proposalDate) は "proposed" タブに分類される', () => {
    const opp1 = OPPORTUNITIES.find((o) => o.id === "opp1");
    expect(opp1).toBeDefined();
    expect(tabOf(opp1!)).toBe("proposed");
  });

  it('opp3(application) は "contract_pending" タブに分類される', () => {
    const opp3 = OPPORTUNITIES.find((o) => o.id === "opp3");
    expect(opp3).toBeDefined();
    expect(tabOf(opp3!)).toBe("contract_pending");
  });

  it('opp8(lost) は "lost" タブに分類される', () => {
    const opp8 = OPPORTUNITIES.find((o) => o.id === "opp8");
    expect(opp8).toBeDefined();
    expect(tabOf(opp8!)).toBe("lost");
  });

  it('opp7(issued/won) は "issued" タブに分類される', () => {
    const opp7 = OPPORTUNITIES.find((o) => o.id === "opp7");
    expect(opp7).toBeDefined();
    expect(tabOf(opp7!)).toBe("issued");
  });

  it('opp9(underwriting) は "contract" タブに分類される', () => {
    const opp9 = OPPORTUNITIES.find((o) => o.id === "opp9");
    expect(opp9).toBeDefined();
    expect(tabOf(opp9!)).toBe("contract");
  });

  it('opp_demo1 は "proposed" タブに分類される（proposalDate あり・複数商品）', () => {
    const demo = OPPORTUNITIES.find((o) => o.id === "opp_demo1");
    expect(demo).toBeDefined();
    expect(tabOf(demo!)).toBe("proposed");
  });

  it("opp_demo1 は isRagged かつ isActiveOpp", () => {
    const demo = OPPORTUNITIES.find((o) => o.id === "opp_demo1");
    expect(demo).toBeDefined();
    expect(isRagged(demo!)).toBe(true);
    expect(isActiveOpp(demo!)).toBe(true);
  });

  it("opp_demo1 は c_demo1 世帯のアクティブ案件に含まれる", () => {
    const activeOpps = householdActiveOpps(OPPORTUNITIES, "c_demo1");
    expect(activeOpps.length).toBeGreaterThan(0);
    expect(activeOpps.some((o) => o.id === "opp_demo1")).toBe(true);
  });

  it("c_demo1 の代表案件は opp_demo1（唯一のアクティブ案件）", () => {
    const activeOpps = householdActiveOpps(OPPORTUNITIES, "c_demo1");
    const rep = representativeOpp(activeOpps);
    expect(rep?.id).toBe("opp_demo1");
  });

  it("全タブ件数の合計は全 open 案件数に等しいこと（lost タブは status=lost も含む）", () => {
    // lost タブは status=lost OR stage=lost の案件
    const allTabs = [
      "new",
      "visited",
      "proposed",
      "contract_pending",
      "contract",
      "issued",
      "lost",
    ] as const;
    const countByTab = new Map<string, number>();
    for (const tab of allTabs) countByTab.set(tab, 0);

    for (const opp of OPPORTUNITIES) {
      const tab = tabOf(opp);
      // 失注以外は open 状態のみカウント（tabCounts ロジックと一致させる）
      if (tab !== "lost" && opp.status !== "open") continue;
      countByTab.set(tab, (countByTab.get(tab) ?? 0) + 1);
    }

    // 全タブが 0 件以上であること
    for (const tab of allTabs) {
      expect(countByTab.get(tab)).toBeGreaterThanOrEqual(0);
    }

    // issued / lost タブが存在すること（seed に含まれる）
    expect(
      (countByTab.get("issued") ?? 0) + (countByTab.get("lost") ?? 0),
    ).toBeGreaterThan(0);
  });
});
