// =====================================================
// opportunityStageb4.effectiveStage.test.ts
// ADR-B4 v2 ステージ導出テスト — effectiveStage
//   §B4-3-2 effectiveStage（日付駆動 + 既存 seed フォールバック + 律速）
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity } from "../types";
import { effectiveStage } from "../utils/opportunityStage";

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

// ─── §B4-3-2. effectiveStage（日付駆動・律速・フォールバック） ──────────────────
describe("effectiveStage（ADR-B4 v2 日付駆動版）", () => {
  it("milestones/proposals 全て空 → opp.stage フォールバック（既存 seed 互換）", () => {
    const opp = mkOpp({
      id: "es1",
      householdId: "c1",
      stage: "proposed",
      status: "open",
      proposalProducts: [],
    });
    expect(effectiveStage(opp)).toBe("proposed");
  });

  it("milestones に firstConsultDate のみ → fact_finding（日付駆動）", () => {
    const opp = mkOpp({
      id: "es2",
      householdId: "c1",
      stage: "first_consult",
      status: "open",
      milestones: { firstConsultDate: "2026-07-01" },
    });
    expect(effectiveStage(opp)).toBe("first_consult");
  });

  it("contractDate あり・establishedDate なし → underwriting（契約タブ）", () => {
    const opp = mkOpp({
      id: "es3",
      householdId: "c1",
      stage: "contract_pending",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
      },
    });
    expect(effectiveStage(opp)).toBe("contract");
  });

  it("proposals があれば latestProposalDate で提案ステージを判定", () => {
    const opp = mkOpp({
      id: "es4",
      householdId: "c1",
      stage: "first_consult",
      status: "open",
      proposals: [
        {
          id: "r1",
          roundNo: 1,
          proposalDate: "2026-07-25",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    // proposals から proposalDate が取れる → proposal stage
    expect(effectiveStage(opp)).toBe("proposed");
  });

  it("lostDate は最優先 → 他の日付があっても lost", () => {
    const opp = mkOpp({
      id: "es5",
      householdId: "c1",
      stage: "contract_pending",
      status: "open",
      milestones: {
        establishedDate: "2026-08-20",
        lostDate: "2026-08-25",
      },
    });
    expect(effectiveStage(opp)).toBe("lost");
  });

  it("商品個別 milestones で律速（生命=contractDate/医療=proposalDate → proposal に律速）", () => {
    const opp = mkOpp({
      id: "es6",
      householdId: "c1",
      stage: "contract_pending",
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
            // applicationDate/contractDate は未入力（提案まで）
          },
        },
      ],
    });
    // 生命=underwriting(contractDate), 医療=proposal(proposalDateまで) → proposal に律速
    expect(effectiveStage(opp)).toBe("proposed");
  });

  it("商品個別 milestones なし・商品 stage あり → legacy 律速（B3 互換）", () => {
    // milestones が全て空なので日付ゼロパスへ。商品 stage で律速
    const opp = mkOpp({
      id: "es7",
      householdId: "c1",
      stage: "contract_pending",
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
          stage: "first_consult",
        },
      ],
    });
    expect(effectiveStage(opp)).toBe("first_consult");
  });
});
