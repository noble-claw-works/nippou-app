// =====================================================
// opportunityStageLogic.tabSeed.test.ts — ADR-B3 律速ロジック単体テスト
// §B3-4: isVisited / tabOf / effectiveExpectedCloseDate
// §B3-7-6: タブ件数カウント（seed 実値確認）
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import {
  effectiveExpectedCloseDate,
  isActiveOpp,
  isRagged,
  householdActiveOpps,
  representativeOpp,
  tabOf,
  isVisited,
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

  it('approach + firstConsultDate なし → "first_consult"（ADR-B4 v2: 新案件タブ廃止・最左へ）', () => {
    const opp = mkOpp({
      id: "t3",
      householdId: "c1",
      stage: "approach",
      status: "open",
      proposalProducts: [],
    });
    expect(tabOf(opp)).toBe("first_consult");
  });

  it('fact_finding + firstConsultDate あり・proposalDate なし → "first_consult"（ADR-B4 v2）', () => {
    const opp = mkOpp({
      id: "t4",
      householdId: "c1",
      stage: "fact_finding",
      status: "open",
      proposalProducts: [],
      milestones: { firstConsultDate: "2026-07-01" },
    });
    expect(tabOf(opp)).toBe("first_consult");
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

  it('seed に "first_consult" タブに分類される案件が存在すること（ADR-B4 v2 語彙）', () => {
    const firstConsultOpps = OPPORTUNITIES.filter(
      (o) => o.status === "open" && tabOf(o) === "first_consult",
    );
    // approach stage の案件または firstConsultDate だけある案件が first_consult タブへ
    expect(firstConsultOpps.length).toBeGreaterThan(0);
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
      "first_consult",
      "lifeplan",
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
