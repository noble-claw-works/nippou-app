// =====================================================
// zeroTabElimination.test.ts — 案件詳細 (0)タブ解消確認
//
// 主上フィードバック 2026-08-25:
// 「(0)の項目をなくしてください。すべてにサンプル表示してください。」
//
// 検証: 全案件（opp1〜opp9, opp_demo1）の各タブカウントが
//   proposalProducts.length > 0
//   proposals.length > 0   (factfinding/approach除く)
//   opportunityId紐付きの活動ブロック > 0
//   opportunityId紐付きのTODO > 0
// となっていること。
// =====================================================
import { describe, it, expect } from "vitest";
import { OPPORTUNITIES, REPORTS } from "../data/seed";

// ── ヘルパー ──────────────────────────────────────────────────────────────────
function getRelatedBlocks(oppId: string) {
  return REPORTS.flatMap((r) => r.blocks ?? []).filter(
    (b) => b.opportunityId === oppId,
  );
}

function getRelatedTodos(oppId: string) {
  return REPORTS.flatMap((r) => (r.todos ?? []).map((t) => ({ ...t, date: r.date }))).filter(
    (t) => t.opportunityId === oppId,
  );
}

// アクティブ系案件（提案・交渉以降の段階でproposal履歴が期待される）
const OPPS_WITH_PROPOSALS = [
  "opp1", "opp2", "opp3", "opp5", "opp6",
  "opp7", "opp8", "opp9", "opp_demo1",
];

// proposalProducts が必要な全案件
const ALL_OPP_IDS = [
  "opp1", "opp2", "opp3", "opp4", "opp5", "opp6",
  "opp7", "opp8", "opp9", "opp10", "opp11", "opp_demo1",
];

// 活動ブロック紐付けが期待される案件
const OPPS_WITH_ACTIVITIES = [
  "opp1", "opp2", "opp3", "opp4", "opp5", "opp6",
  "opp7", "opp8", "opp9", "opp10", "opp11", "opp_demo1",
];

// TODO紐付けが期待される案件
const OPPS_WITH_TODOS = [
  "opp1", "opp2", "opp3", "opp4", "opp5", "opp6",
  "opp7", "opp8", "opp9", "opp10", "opp11", "opp_demo1",
];

// ── §Z1: 提案商品 (proposalProducts) — 全案件 > 0 ─────────────────────────────
describe("§Z1: 全案件に proposalProducts が登載されている（提案商品タブが(0)にならない）", () => {
  for (const oppId of ALL_OPP_IDS) {
    it(`${oppId} の proposalProducts.length > 0`, () => {
      const opp = OPPORTUNITIES.find((o) => o.id === oppId);
      expect(opp, `${oppId} が OPPORTUNITIES に見つからない`).toBeDefined();
      expect(
        opp!.proposalProducts.length,
        `${oppId}.proposalProducts が空`,
      ).toBeGreaterThan(0);
    });
  }

  it("全 proposalProduct の ID が一意（重複なし）", () => {
    const allIds = OPPORTUNITIES.flatMap((o) =>
      o.proposalProducts.map((p) => p.id),
    );
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });
});

// ── §Z2: 提案履歴 (proposals/ProposalRound) — 中盤以降の案件 > 0 ────────────────
describe("§Z2: 提案段階以降の案件に proposals が登載されている（提案履歴タブが(0)にならない）", () => {
  for (const oppId of OPPS_WITH_PROPOSALS) {
    it(`${oppId} の proposals.length > 0`, () => {
      const opp = OPPORTUNITIES.find((o) => o.id === oppId);
      expect(opp, `${oppId} が OPPORTUNITIES に見つからない`).toBeDefined();
      expect(
        (opp!.proposals ?? []).length,
        `${oppId}.proposals が空`,
      ).toBeGreaterThan(0);
    });
  }

  it("全 ProposalRound の ID が一意（重複なし）", () => {
    const allIds = OPPORTUNITIES.flatMap((o) =>
      (o.proposals ?? []).map((r) => r.id),
    );
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it("各 ProposalRound の roundNo は連番（1始まり）", () => {
    for (const opp of OPPORTUNITIES) {
      const rounds = opp.proposals ?? [];
      rounds.forEach((r, i) => {
        expect(
          r.roundNo,
          `${opp.id} のラウンド ${i + 1} の roundNo が不正`,
        ).toBe(i + 1);
      });
    }
  });
});

// ── §Z3: 活動履歴 (relatedBlocks) — 全案件 > 0 ──────────────────────────────
describe("§Z3: 全案件に opportunityId 紐付きの活動ブロックが存在する（活動履歴タブが(0)にならない）", () => {
  for (const oppId of OPPS_WITH_ACTIVITIES) {
    it(`${oppId} に紐付く活動ブロックが > 0 件`, () => {
      const blocks = getRelatedBlocks(oppId);
      expect(
        blocks.length,
        `${oppId} に opportunityId が紐付いた TimeBlock が見当たらない`,
      ).toBeGreaterThan(0);
    });
  }
});

// ── §Z4: TODO (relatedTodos) — 全案件 > 0 ─────────────────────────────────
describe("§Z4: 全案件に opportunityId 紐付きの TODO が存在する（TODOタブが(0)にならない）", () => {
  for (const oppId of OPPS_WITH_TODOS) {
    it(`${oppId} に紐付く TODO が > 0 件`, () => {
      const todos = getRelatedTodos(oppId);
      expect(
        todos.length,
        `${oppId} に opportunityId が紐付いた TODO が見当たらない`,
      ).toBeGreaterThan(0);
    });
  }
});

// ── §Z5: タスク (opp.tasks) — 主要案件 > 0 ────────────────────────────────
describe("§Z5: タスクが登載されている主要案件（タスクタブが0/0にならない）", () => {
  const OPPS_WITH_TASKS = [
    "opp1", "opp2", "opp5", "opp_demo1",
  ];

  for (const oppId of OPPS_WITH_TASKS) {
    it(`${oppId} の tasks.length > 0`, () => {
      const opp = OPPORTUNITIES.find((o) => o.id === oppId);
      expect(opp).toBeDefined();
      expect((opp!.tasks ?? []).length).toBeGreaterThan(0);
    });
  }

  it("全案件タスク ID が一意（重複なし）", () => {
    const allTaskIds = OPPORTUNITIES.flatMap((o) =>
      (o.tasks ?? []).map((t) => t.id),
    );
    const unique = new Set(allTaskIds);
    expect(unique.size).toBe(allTaskIds.length);
  });
});

// ── §Z6: 主要案件のサマリー確認 ─────────────────────────────────────────────
describe("§Z6: 主要案件（opp1/opp2/opp5）の(0)タブ総合確認", () => {
  it("opp1 (GILSON家 生命保険): 全タブに1件以上", () => {
    const opp = OPPORTUNITIES.find((o) => o.id === "opp1")!;
    expect(opp.proposalProducts.length).toBeGreaterThan(0);
    expect((opp.proposals ?? []).length).toBeGreaterThan(0);
    expect(getRelatedBlocks("opp1").length).toBeGreaterThan(0);
    expect(getRelatedTodos("opp1").length).toBeGreaterThan(0);
    expect((opp.tasks ?? []).length).toBeGreaterThan(0);
  });

  it("opp2 (齋藤家 医療保険): 全タブに1件以上", () => {
    const opp = OPPORTUNITIES.find((o) => o.id === "opp2")!;
    expect(opp.proposalProducts.length).toBeGreaterThan(0);
    expect((opp.proposals ?? []).length).toBeGreaterThan(0);
    expect(getRelatedBlocks("opp2").length).toBeGreaterThan(0);
    expect(getRelatedTodos("opp2").length).toBeGreaterThan(0);
    expect((opp.tasks ?? []).length).toBeGreaterThan(0);
  });

  it("opp5 (高橋家 自動車保険): 主要タブに1件以上", () => {
    const opp = OPPORTUNITIES.find((o) => o.id === "opp5")!;
    expect(opp.proposalProducts.length).toBeGreaterThan(0);
    expect(getRelatedBlocks("opp5").length).toBeGreaterThan(0);
    expect(getRelatedTodos("opp5").length).toBeGreaterThan(0);
    expect((opp.tasks ?? []).length).toBeGreaterThan(0);
  });
});
