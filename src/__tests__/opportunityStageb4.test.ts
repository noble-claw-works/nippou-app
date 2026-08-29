// =====================================================
// opportunityStageb4.test.ts — ADR-B4 v2 ステージ導出テスト
//
// テスト観点:
//   §B4-3  確定真理値表（7タブ全境界）
//   §B4-3-1 latestProposalDate（proposals 最新ラウンド / milestones fallback）
//   §B4-3-2 effectiveStage（日付駆動 + 既存 seed フォールバック + 律速）
//   §B4-3-3 tabOf（7タブ・日付駆動版）
//   §B4-4   TAB_META・stageToTabKey 確認
//   contractDate 追加後の境界（契約/契約予定 分離）
//   proposals 複数ラウンド時の最新提案日でステージ判定
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity, ContractMilestones } from "../types";
import {
  effectiveStage,
  isRagged,
  stageFromMilestones,
  latestProposalDate,
  tabOf,
  TAB_META,
  STAGE_TO_TAB,
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

// ─── §B4-3-2. effectiveStage（日付駆動・律速・フォールバック） ──────────────────
describe("effectiveStage（ADR-B4 v2 日付駆動版）", () => {
  it("milestones/proposals 全て空 → opp.stage フォールバック（既存 seed 互換）", () => {
    const opp = mkOpp({
      id: "es1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      proposalProducts: [],
    });
    expect(effectiveStage(opp)).toBe("proposal");
  });

  it("milestones に firstConsultDate のみ → fact_finding（日付駆動）", () => {
    const opp = mkOpp({
      id: "es2",
      householdId: "c1",
      stage: "approach",
      status: "open",
      milestones: { firstConsultDate: "2026-07-01" },
    });
    expect(effectiveStage(opp)).toBe("fact_finding");
  });

  it("contractDate あり・establishedDate なし → underwriting（契約タブ）", () => {
    const opp = mkOpp({
      id: "es3",
      householdId: "c1",
      stage: "application",
      status: "open",
      milestones: {
        firstConsultDate: "2026-07-01",
        proposalDate: "2026-07-20",
        applicationDate: "2026-08-01",
        contractDate: "2026-08-10",
      },
    });
    expect(effectiveStage(opp)).toBe("underwriting");
  });

  it("proposals があれば latestProposalDate で提案ステージを判定", () => {
    const opp = mkOpp({
      id: "es4",
      householdId: "c1",
      stage: "approach",
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
    expect(effectiveStage(opp)).toBe("proposal");
  });

  it("lostDate は最優先 → 他の日付があっても lost", () => {
    const opp = mkOpp({
      id: "es5",
      householdId: "c1",
      stage: "application",
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
      stage: "application",
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
    expect(effectiveStage(opp)).toBe("proposal");
  });

  it("商品個別 milestones なし・商品 stage あり → legacy 律速（B3 互換）", () => {
    // milestones が全て空なので日付ゼロパスへ。商品 stage で律速
    const opp = mkOpp({
      id: "es7",
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
    });
    expect(effectiveStage(opp)).toBe("fact_finding");
  });
});

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
