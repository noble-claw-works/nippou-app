// =====================================================
// opportunityStageb4.tabMeta.test.ts
// ADR-B4 v2 ステージ導出テスト — §B4-4 TAB_META / §B4-3 stageFromMilestones / latestProposalDate
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity, ContractMilestones } from "../types";
import {
  stageFromMilestones,
  latestProposalDate,
  TAB_META,
  STAGE_TO_TAB,
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

// ─── §B4-4. TAB_META 確認 ────────────────────────────────────────────────────────
describe("TAB_META (7タブ定義・ADR-B4 v2 語彙)", () => {
  it("7タブ定義が左→右順(初回相談/LP提案/提案/契約予定/契約/成立/失注)であること", () => {
    const keys = TAB_META.map((t) => t.key);
    expect(keys).toEqual([
      "first_consult",
      "lifeplan",
      "proposed",
      "contract_pending",
      "contract",
      "issued",
      "lost",
    ]);
  });

  it("各タブのラベルが確定仕様どおりであること", () => {
    const labels = TAB_META.map((t) => t.label);
    expect(labels).toEqual([
      "初回相談",
      "LP提案",
      "提案",
      "契約予定",
      "契約",
      "成立",
      "失注",
    ]);
  });

  it("STAGE_TO_TAB: approach → first_consult（新案件タブ廃止）", () => {
    expect(STAGE_TO_TAB["approach"]).toBe("first_consult");
  });

  it("STAGE_TO_TAB: fact_finding → first_consult", () => {
    expect(STAGE_TO_TAB["fact_finding"]).toBe("first_consult");
  });

  it("STAGE_TO_TAB: needs_analysis → lifeplan", () => {
    expect(STAGE_TO_TAB["needs_analysis"]).toBe("lifeplan");
  });

  it("STAGE_TO_TAB: proposal → proposed", () => {
    expect(STAGE_TO_TAB["proposal"]).toBe("proposed");
  });

  it("STAGE_TO_TAB: negotiation → proposed", () => {
    expect(STAGE_TO_TAB["negotiation"]).toBe("proposed");
  });

  it("STAGE_TO_TAB: application → contract_pending", () => {
    expect(STAGE_TO_TAB["application"]).toBe("contract_pending");
  });

  it("STAGE_TO_TAB: underwriting → contract", () => {
    expect(STAGE_TO_TAB["underwriting"]).toBe("contract");
  });

  it("STAGE_TO_TAB: issued → issued", () => {
    expect(STAGE_TO_TAB["issued"]).toBe("issued");
  });

  it("STAGE_TO_TAB: lost → lost", () => {
    expect(STAGE_TO_TAB["lost"]).toBe("lost");
  });
});

// ─── §B4-3-1. stageFromMilestones（確定真理値表） ────────────────────────────────
describe("stageFromMilestones（確定真理値表 §B4-3）", () => {
  const baseOpp = mkOpp({
    id: "base",
    householdId: "c1",
    stage: "approach",
    status: "open",
  });

  it("milestones が undefined → approach（日付ゼロ）", () => {
    expect(stageFromMilestones(baseOpp, undefined)).toBe("approach");
  });

  it("milestones が空オブジェクト → approach", () => {
    expect(stageFromMilestones(baseOpp, {})).toBe("approach");
  });

  it("firstConsultDate のみ → fact_finding（初回相談タブ）", () => {
    const m: ContractMilestones = { firstConsultDate: "2026-07-01" };
    expect(stageFromMilestones(baseOpp, m)).toBe("fact_finding");
  });

  it("lifePlanDate あり・proposalDate なし → needs_analysis（LP提案タブ）", () => {
    const m: ContractMilestones = {
      firstConsultDate: "2026-07-01",
      lifePlanDate: "2026-07-10",
    };
    expect(stageFromMilestones(baseOpp, m)).toBe("needs_analysis");
  });

  it("proposalDate あり・applicationDate なし → proposal（提案タブ）", () => {
    const m: ContractMilestones = {
      firstConsultDate: "2026-07-01",
      lifePlanDate: "2026-07-10",
      proposalDate: "2026-07-20",
    };
    expect(stageFromMilestones(baseOpp, m)).toBe("proposal");
  });

  it("applicationDate あり・contractDate なし → application（契約予定タブ）", () => {
    const m: ContractMilestones = {
      firstConsultDate: "2026-07-01",
      proposalDate: "2026-07-20",
      applicationDate: "2026-08-01",
    };
    expect(stageFromMilestones(baseOpp, m)).toBe("application");
  });

  it("contractDate あり・establishedDate なし → underwriting（契約タブ）", () => {
    const m: ContractMilestones = {
      firstConsultDate: "2026-07-01",
      proposalDate: "2026-07-20",
      applicationDate: "2026-08-01",
      contractDate: "2026-08-10",
    };
    expect(stageFromMilestones(baseOpp, m)).toBe("underwriting");
  });

  it("establishedDate あり → issued（成立タブ）", () => {
    const m: ContractMilestones = {
      firstConsultDate: "2026-07-01",
      proposalDate: "2026-07-20",
      applicationDate: "2026-08-01",
      contractDate: "2026-08-10",
      establishedDate: "2026-08-20",
    };
    expect(stageFromMilestones(baseOpp, m)).toBe("issued");
  });

  it("lostDate あり（最優先）→ lost（成立日があっても失注）", () => {
    const m: ContractMilestones = {
      firstConsultDate: "2026-07-01",
      establishedDate: "2026-08-20",
      lostDate: "2026-08-25",
    };
    expect(stageFromMilestones(baseOpp, m)).toBe("lost");
  });

  it("lostDate だけある → lost（他の日付なしでも失注が最優先）", () => {
    const m: ContractMilestones = { lostDate: "2026-07-15" };
    expect(stageFromMilestones(baseOpp, m)).toBe("lost");
  });

  it("contractDate あり・applicationDate なし → underwriting（applicationDate不要）", () => {
    // 契約日があれば契約予定日なしでも契約タブ
    const m: ContractMilestones = {
      firstConsultDate: "2026-07-01",
      contractDate: "2026-08-10",
    };
    expect(stageFromMilestones(baseOpp, m)).toBe("underwriting");
  });
});

// ─── §B4-3-1. latestProposalDate ─────────────────────────────────────────────────
describe("latestProposalDate（proposals 最新ラウンド / milestones fallback）", () => {
  it("proposals なし・milestones.proposalDate あり → milestones の proposalDate を返す", () => {
    const opp = mkOpp({
      id: "lp1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      milestones: { proposalDate: "2026-07-20" },
    });
    expect(latestProposalDate(opp)).toBe("2026-07-20");
  });

  it("proposals なし・milestones.proposalDate なし → undefined", () => {
    const opp = mkOpp({
      id: "lp2",
      householdId: "c1",
      stage: "approach",
      status: "open",
    });
    expect(latestProposalDate(opp)).toBeUndefined();
  });

  it("proposals 1ラウンド → そのラウンドの proposalDate を返す", () => {
    const opp = mkOpp({
      id: "lp3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
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
    expect(latestProposalDate(opp)).toBe("2026-07-20");
  });

  it("proposals 複数ラウンド → 最新（最も日付が遅い）ラウンドの proposalDate を返す", () => {
    const opp = mkOpp({
      id: "lp4",
      householdId: "c1",
      stage: "proposal",
      status: "open",
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
        {
          id: "r3",
          roundNo: 3,
          proposalDate: "2026-07-15",
          productIds: [],
          createdAt: _now,
        },
      ],
    });
    expect(latestProposalDate(opp)).toBe("2026-07-25");
  });

  it("proposals あり・milestones.proposalDate もあり → proposals 最新を優先する", () => {
    const opp = mkOpp({
      id: "lp5",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      milestones: { proposalDate: "2026-07-05" }, // 古い値
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
    expect(latestProposalDate(opp)).toBe("2026-07-25");
  });
});
