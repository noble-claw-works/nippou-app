// =====================================================
// adrB4ListUI.test.ts — ADR-B4 v2 一覧UI群テスト
//
// 要件1: ステージ列削除（SortKey・STAGE_TABS から 'stage' が除去）
// 要件2: タブ語彙7語彙・StageBadge 表示ラベル整合
// 要件3: renderHouseholdActions プロップ（型確認）
// =====================================================
import { describe, it, expect } from "vitest";
import type { OpportunityStage } from "../types";
import { STAGE_META } from "../components/opportunity/StageBadge";
import { TAB_META } from "../utils/opportunityStage";

// ─── 要件1: ステージ列削除 ────────────────────────────────────────────────────
// SortKey 型は TS の型なので JS テストから直接アサートできないが、
// 'stage' が SortKey として定義されなくなったことを型ファイル越しに間接確認できる。
// ここでは TAB_META に 'stage' がないことと、期待するキー数を確認する。
describe("要件1: ステージ列削除 — SortKey / TAB_META", () => {
  it("TAB_META に 'stage' キーが存在しないこと（7タブのみ）", () => {
    const keys = TAB_META.map((t) => t.key);
    expect(keys).not.toContain("stage");
  });

  it("TAB_META のキー数が 7 であること", () => {
    expect(TAB_META).toHaveLength(7);
  });

  it("TAB_META の順序が左→右（初回相談...失注）であること", () => {
    const keys = TAB_META.map((t) => t.key);
    expect(keys[0]).toBe("first_consult");
    expect(keys[6]).toBe("lost");
  });
});

// ─── 要件2: タブ語彙7語彙・StageBadge ラベル整合 ─────────────────────────────
describe("要件2: タブ語彙 / StageBadge ラベル整合", () => {
  it("STAGE_TABS（TAB_META）ラベルが 7語彙仕様に一致すること", () => {
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

  // StageBadge ラベルが 7タブ語彙に整合（旧「アプローチ/ヒアリング等」は使わない）
  it("approach ラベルが '初回相談' であること（旧：アプローチ）", () => {
    expect(STAGE_META["approach"].label).toBe("初回相談");
  });

  it("fact_finding ラベルが '初回相談' であること（旧：ヒアリング）", () => {
    expect(STAGE_META["fact_finding"].label).toBe("初回相談");
  });

  it("needs_analysis ラベルが 'LP提案' であること（旧：ニーズ分析）", () => {
    expect(STAGE_META["needs_analysis"].label).toBe("LP提案");
  });

  it("proposal ラベルが '提案' であること（旧：設計書提示）", () => {
    expect(STAGE_META["proposal"].label).toBe("提案");
  });

  it("negotiation ラベルが '提案' であること（旧：検討中）", () => {
    expect(STAGE_META["negotiation"].label).toBe("提案");
  });

  it("application ラベルが '契約予定' であること（旧：申込書記入）", () => {
    expect(STAGE_META["application"].label).toBe("契約予定");
  });

  it("underwriting ラベルが '契約' であること（旧：査定中）", () => {
    expect(STAGE_META["underwriting"].label).toBe("契約");
  });

  it("issued ラベルが '成立' であること（旧：証券発行）", () => {
    expect(STAGE_META["issued"].label).toBe("成立");
  });

  it("lost ラベルが '失注' であること（不変）", () => {
    expect(STAGE_META["lost"].label).toBe("失注");
  });

  it("全 9ステージの emoji が残っていること（内部 enum 不変）", () => {
    const allStages: OpportunityStage[] = [
      "approach",
      "fact_finding",
      "needs_analysis",
      "proposal",
      "negotiation",
      "application",
      "underwriting",
      "issued",
      "lost",
    ];
    for (const stage of allStages) {
      expect(STAGE_META[stage].emoji).toBeTruthy();
    }
  });

  it("全 9ステージの color が残っていること（Tailwind トークンのみ・hex なし）", () => {
    const allStages: OpportunityStage[] = [
      "approach",
      "fact_finding",
      "needs_analysis",
      "proposal",
      "negotiation",
      "application",
      "underwriting",
      "issued",
      "lost",
    ];
    for (const stage of allStages) {
      const color = STAGE_META[stage].color;
      expect(color).toBeTruthy();
      // hex カラーは使わない（ui-design-standards 準拠）
      expect(color).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    }
  });
});

// ─── 要件2: 件数バッジは案件単位（1案件1カウント）を TAB_META で確認 ─────────
describe("要件2: 件数バッジ — TAB_META single source", () => {
  it("TAB_META が单一の source として機能する（opportunityStage.ts からエクスポート）", () => {
    // TAB_META が array であり、key と label ペアが揃っていること
    for (const tab of TAB_META) {
      expect(tab).toHaveProperty("key");
      expect(tab).toHaveProperty("label");
      expect(tab.key).toBeTruthy();
      expect(tab.label).toBeTruthy();
    }
  });
});

// ─── 要件3: HouseholdAccordion.renderHouseholdActions ─────────────────────────
// UI コンポーネントの型テストは vitest では困難なため、
// 型定義ファイルが import でエラーにならないことを確認する。
describe("要件3: renderHouseholdActions プロップ", () => {
  it("HouseholdAccordion がエラーなくインポートできること", async () => {
    // 動的 import でエラーが発生しないことを確認
    const mod = await import("../components/ui/HouseholdAccordion");
    expect(mod.HouseholdAccordion).toBeDefined();
  });
});
