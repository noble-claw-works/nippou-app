// =====================================================
// roadmapTemplateStore.test.ts — ロードマップ版管理の store 統合テスト（T5-07 §8.4）
// - 権限ガード（manager のみ発行）
// - 版インクリメント / 過去版の不変性（スナップショット）
// - saveRoadmapAnswers が当時の版番号で回答を保持
// - migrateRoadmapToVersioned の冪等性
// =====================================================
import { describe, it, expect } from "vitest";
import { useAppStore } from "../store";
import type { RenewalCase, RenewalRoadmapItemDef } from "../types";
import {
  buildSeedRoadmapTemplateV1,
  SEED_ROADMAP_ITEM_DEFS,
  migrateRoadmapToVersioned,
} from "../utils/renewalMigration";

function makeRenewalCase(overrides: Partial<RenewalCase> = {}): RenewalCase {
  const now = new Date().toISOString();
  return {
    id: "rc_rm_01",
    policyId: "pol_test",
    householdId: "c1",
    contractorPersonId: "p_c1_head",
    contractorName: "テスト太郎",
    ownerUserId: "u1",
    insurer: "テスト保険",
    maturityDate: "2027-03-01",
    productType: "auto",
    method: "undecided",
    status: "not_started",
    survey: {},
    notes: [],
    activityLog: [],
    tasks: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function resetStore(role: string) {
  localStorage.clear();
  useAppStore.setState({
    roadmapTemplateVersions: [buildSeedRoadmapTemplateV1()],
    currentRole: role as never,
    currentUserId: "u_mgr",
    renewalCases: [makeRenewalCase()],
  });
}

const changedItems: RenewalRoadmapItemDef[] = [
  { id: "rm_home_repair", order: 1, label: "住宅リフォーム改", active: true },
  { id: "rm_fire_renewal", order: 2, label: "火災更新", active: true },
  { id: "rm_new_edu", order: 3, label: "教育資金", active: true },
];

describe("publishRoadmapTemplate — 権限ガード", () => {
  it("manager 以外は発行できない（general）", () => {
    resetStore("general");
    expect(() =>
      useAppStore.getState().publishRoadmapTemplate(changedItems, "u1"),
    ).toThrow();
  });

  it("manager 以外は発行できない（admin）", () => {
    resetStore("admin");
    expect(() =>
      useAppStore.getState().publishRoadmapTemplate(changedItems, "u1"),
    ).toThrow();
  });

  it("manager は発行できる", () => {
    resetStore("manager");
    const v = useAppStore.getState().publishRoadmapTemplate(changedItems, "u_mgr");
    expect(v.version).toBe(2);
  });
});

describe("publishRoadmapTemplate — 版インクリメント / 不変性", () => {
  it("発行で版番号が +1 され、最新版になる", () => {
    resetStore("manager");
    const before = useAppStore.getState().getCurrentRoadmapTemplate();
    expect(before?.version).toBe(1);
    useAppStore.getState().publishRoadmapTemplate(changedItems, "u_mgr");
    const after = useAppStore.getState().getCurrentRoadmapTemplate();
    expect(after?.version).toBe(2);
  });

  it("過去版は発行後も当時の項目定義を保持（スナップショット）", () => {
    resetStore("manager");
    useAppStore.getState().publishRoadmapTemplate(changedItems, "u_mgr");

    const v1 = useAppStore.getState().getRoadmapTemplateVersion(1);
    const v2 = useAppStore.getState().getRoadmapTemplateVersion(2);

    // v1 は seed のラベルのまま
    const v1Home = v1?.items.find((i) => i.id === "rm_home_repair");
    expect(v1Home?.label).toBe("住宅修繕");
    // v2 は変更後ラベル
    const v2Home = v2?.items.find((i) => i.id === "rm_home_repair");
    expect(v2Home?.label).toBe("住宅リフォーム改");
    // v1 には教育資金は存在しない
    expect(v1?.items.find((i) => i.id === "rm_new_edu")).toBeUndefined();
  });
});

describe("saveRoadmapAnswers — 当時の版で回答を保持", () => {
  it("回答保存時の最新版番号がスナップショットされる", () => {
    resetStore("manager");
    // v1 の項目で回答
    useAppStore
      .getState()
      .saveRoadmapAnswers(
        "rc_rm_01",
        [{ itemDefId: "rm_home_repair", value: true }],
        { userId: "u_mgr" },
      );
    let rc = useAppStore.getState().renewalCases.find((c) => c.id === "rc_rm_01");
    expect(rc?.roadmapVersions?.[0].templateVersion).toBe(1);

    // v2 を発行してから再回答 → 新しい回答は v2 を指す
    useAppStore.getState().publishRoadmapTemplate(changedItems, "u_mgr");
    useAppStore
      .getState()
      .saveRoadmapAnswers(
        "rc_rm_01",
        [{ itemDefId: "rm_new_edu", value: true }],
        { userId: "u_mgr" },
      );
    rc = useAppStore.getState().renewalCases.find((c) => c.id === "rc_rm_01");
    const vs = rc?.roadmapVersions ?? [];
    // 最初の回答は v1 のまま、最新の回答は v2
    expect(vs[0].templateVersion).toBe(1);
    expect(vs[vs.length - 1].templateVersion).toBe(2);
  });
});

describe("migrateRoadmapToVersioned — 冪等性", () => {
  it("survey.roadmap を版化し、再実行しても増えない", () => {
    const rc = makeRenewalCase({
      survey: { roadmap: { topConcern: "home_repair", inputDate: "2026-09-01" } },
    });
    const once = migrateRoadmapToVersioned(rc, { userId: "u1" });
    expect((once.roadmapVersions ?? []).length).toBeGreaterThanOrEqual(1);
    const twice = migrateRoadmapToVersioned(once, { userId: "u1" });
    // 冪等: 版が増えない & 既存版化済みなら同一参照を返す
    expect(twice).toBe(once);
    expect((twice.roadmapVersions ?? []).length).toBe(
      (once.roadmapVersions ?? []).length,
    );
  });

  it("survey.roadmap が無い場合は何もしない", () => {
    const rc = makeRenewalCase();
    const out = migrateRoadmapToVersioned(rc);
    expect(out).toBe(rc);
    expect(out.roadmapVersions).toBeUndefined();
  });

  it("seed テンプレは 4 項目", () => {
    expect(SEED_ROADMAP_ITEM_DEFS).toHaveLength(4);
  });
});
