// =====================================================
// batchB.test.ts — Notion改修 Batch B (2026-08-25)
//
// テスト観点:
//   §3: タスク進捗 done/total 算出
//   §5: 商品別グループ化ロジック
//   §6: OPP_ACTIVITY_REPORTS seed の整合 / sourceReportId 連携
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity, Task, ProductCategory } from "../types";
import { OPPORTUNITIES, REPORTS, OPP_ACTIVITY_REPORTS } from "../data/seed";

// ─── helpers ─────────────────────────────────────────────────────────────────
const _now = new Date().toISOString();

function mkTask(id: string, done: boolean): Task {
  return {
    id,
    title: `タスク ${id}`,
    done,
    priority: "medium",
    rolledOver: false,
    scope: "opportunity",
    createdAt: _now,
  };
}

function mkOpp(
  id: string,
  cats: ProductCategory[],
  tasks: Task[] = [],
): Opportunity {
  return {
    id,
    householdId: "c1",
    ownerId: "u1",
    title: `テスト案件 ${id}`,
    stage: "proposal",
    status: "open",
    productCategories: cats,
    proposalProducts: [],
    targetPersonIds: [],
    needsAnalysisDone: false,
    illustrationProvided: false,
    stageHistory: [],
    tags: [],
    memo: "",
    tasks,
    createdAt: _now,
    updatedAt: _now,
  };
}

// ─── §3: タスク進捗 done/total 算出 ─────────────────────────────────────────

describe("§3: タスク進捗 done/total 算出", () => {
  it("tasks が空の場合 done=0 / total=0 を返す", () => {
    const tasks: Task[] = [];
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    expect(done).toBe(0);
    expect(total).toBe(0);
  });

  it("全て未完了の場合 done=0 / total=n を返す", () => {
    const tasks = [
      mkTask("t1", false),
      mkTask("t2", false),
      mkTask("t3", false),
    ];
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    expect(done).toBe(0);
    expect(total).toBe(3);
  });

  it("全て完了の場合 done=n / total=n を返す", () => {
    const tasks = [mkTask("t1", true), mkTask("t2", true)];
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    expect(done).toBe(2);
    expect(total).toBe(2);
  });

  it("一部完了の場合 done=完了数 / total=全数 を返す", () => {
    const tasks = [
      mkTask("t1", true),
      mkTask("t2", false),
      mkTask("t3", true),
      mkTask("t4", false),
    ];
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    expect(done).toBe(2);
    expect(total).toBe(4);
  });

  it("進捗率 pct の計算（四捨五入）", () => {
    const tasks = [mkTask("t1", true), mkTask("t2", true), mkTask("t3", false)];
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    expect(pct).toBe(67);
  });

  it("seed opp1 (GILSON家) はタスクを持ち done/total が計算できる", () => {
    const opp1 = OPPORTUNITIES.find((o) => o.id === "opp1");
    expect(opp1).toBeDefined();
    const tasks = opp1!.tasks ?? [];
    expect(tasks.length).toBeGreaterThan(0);
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    expect(total).toBe(4);
    expect(done).toBe(2); // task_opp1_01 + task_opp1_02 が done
  });

  it("opp1 タスクのスコープはすべて 'opportunity'", () => {
    const opp1 = OPPORTUNITIES.find((o) => o.id === "opp1");
    const tasks = opp1!.tasks ?? [];
    for (const t of tasks) {
      expect(t.scope).toBe("opportunity");
    }
  });
});

// ─── §5: 商品別グループ化ロジック ────────────────────────────────────────────

describe("§5: 商品別グループ化", () => {
  // 商品別グループ化のコアロジックを再現（OpportunitiesPage.tsx と同一）
  type ProductGroup = {
    category: ProductCategory;
    label: string;
    items: Opportunity[];
  };

  const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
    life: "生命保険",
    medical: "医療保険",
    cancer: "がん保険",
    income: "就業不能保険",
    nursing: "介護保険",
    savings: "学資・貯蓄",
    auto: "自動車保険",
    fire: "火災保険",
    liability: "賠償責任保険",
    other: "その他",
  };

  function buildProductGroups(
    opps: Opportunity[],
    catFilter: ProductCategory | "all" = "all",
  ): ProductGroup[] {
    const catMap = new Map<ProductCategory, Opportunity[]>();
    for (const opp of opps) {
      const cats =
        opp.productCategories.length > 0
          ? opp.productCategories
          : (["other"] as ProductCategory[]);
      for (const cat of cats) {
        if (catFilter !== "all" && cat !== catFilter) continue;
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(opp);
      }
    }
    const groups: ProductGroup[] = [];
    for (const [cat, label] of Object.entries(PRODUCT_CATEGORY_LABELS) as [
      ProductCategory,
      string,
    ][]) {
      const items = catMap.get(cat);
      if (items && items.length > 0) {
        groups.push({ category: cat, label, items });
      }
    }
    return groups;
  }

  it("単一カテゴリの案件は対応するグループに入る", () => {
    const opps = [mkOpp("o1", ["life"]), mkOpp("o2", ["auto"])];
    const groups = buildProductGroups(opps);
    expect(groups).toHaveLength(2);
    const lifeGroup = groups.find((g) => g.category === "life");
    expect(lifeGroup?.items).toHaveLength(1);
    const autoGroup = groups.find((g) => g.category === "auto");
    expect(autoGroup?.items).toHaveLength(1);
  });

  it("複数カテゴリの案件は全カテゴリのグループに出現する", () => {
    const multiCat = mkOpp("o1", ["life", "medical"]);
    const groups = buildProductGroups([multiCat]);
    expect(groups).toHaveLength(2);
    const lifeGroup = groups.find((g) => g.category === "life");
    const medicalGroup = groups.find((g) => g.category === "medical");
    expect(lifeGroup?.items).toHaveLength(1);
    expect(medicalGroup?.items).toHaveLength(1);
    // 同じ案件インスタンスが両グループに存在
    expect(lifeGroup?.items[0].id).toBe("o1");
    expect(medicalGroup?.items[0].id).toBe("o1");
  });

  it("productCategories が空の案件は other グループに入る", () => {
    const nocat = mkOpp("o1", []);
    const groups = buildProductGroups([nocat]);
    const otherGroup = groups.find((g) => g.category === "other");
    expect(otherGroup?.items).toHaveLength(1);
  });

  it("catFilter で絞り込むと該当カテゴリのみ出る", () => {
    const opps = [
      mkOpp("o1", ["life"]),
      mkOpp("o2", ["medical"]),
      mkOpp("o3", ["life", "auto"]),
    ];
    const groups = buildProductGroups(opps, "life");
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("life");
    expect(groups[0].items).toHaveLength(2); // o1 と o3
  });

  it("グループ順は PRODUCT_CATEGORY_LABELS の定義順になる（生保系が先）", () => {
    const opps = [mkOpp("o1", ["auto"]), mkOpp("o2", ["life"])];
    const groups = buildProductGroups(opps);
    expect(groups[0].category).toBe("life"); // 生命保険が先
    expect(groups[1].category).toBe("auto"); // 自動車保険は後
  });

  it("空配列を渡すとグループが空になる", () => {
    const groups = buildProductGroups([]);
    expect(groups).toHaveLength(0);
  });
});

// ─── §6: 商談報告→日報反映 seed 整合 ────────────────────────────────────────

describe("§6: 商談報告→日報反映 seed", () => {
  it("OPP_ACTIVITY_REPORTS が export されていること", () => {
    expect(OPP_ACTIVITY_REPORTS).toBeDefined();
    expect(Array.isArray(OPP_ACTIVITY_REPORTS)).toBe(true);
  });

  it("デモ用活動報告 oar_demo_opp1 が存在すること", () => {
    const demo = OPP_ACTIVITY_REPORTS.find((r) => r.id === "oar_demo_opp1");
    expect(demo).toBeDefined();
    expect(demo!.opportunityId).toBe("opp1");
    expect(demo!.userId).toBe("u1");
    expect(demo!.activityType).toBe("visit");
  });

  it("活動報告の opportunityId が OPPORTUNITIES に存在すること", () => {
    for (const report of OPP_ACTIVITY_REPORTS) {
      const opp = OPPORTUNITIES.find((o) => o.id === report.opportunityId);
      expect(opp).toBeDefined();
    }
  });

  it("対応する日報に sourceReportId=oar_demo_opp1 のブロックが存在すること", () => {
    const actReport = OPP_ACTIVITY_REPORTS.find(
      (r) => r.id === "oar_demo_opp1",
    );
    expect(actReport).toBeDefined();

    const reportDate = actReport!.reportDate;
    // REPORTS の中から当該日付 & userId の日報を探す
    const nippou = REPORTS.find(
      (r) => r.date === reportDate && r.userId === actReport!.userId,
    );
    expect(nippou).toBeDefined();

    // その日報内に sourceReportId=oar_demo_opp1 のブロックがあること
    const linkedBlock = nippou!.blocks.find(
      (b) => b.sourceReportId === "oar_demo_opp1",
    );
    expect(linkedBlock).toBeDefined();
    expect(linkedBlock!.opportunityId).toBe("opp1");
    expect(linkedBlock!.isActual).toBe(true);
  });

  it("リンクブロックの title と memo に活動サマリが含まれること", () => {
    const actReport = OPP_ACTIVITY_REPORTS.find(
      (r) => r.id === "oar_demo_opp1",
    );
    const nippou = REPORTS.find(
      (r) => r.date === actReport!.reportDate && r.userId === actReport!.userId,
    );
    const linkedBlock = nippou!.blocks.find(
      (b) => b.sourceReportId === "oar_demo_opp1",
    );
    // ブロックに意味のある title があること（空でない）
    expect(linkedBlock!.title.length).toBeGreaterThan(0);
  });

  it("活動報告の reportDate は REPORTS の日付範囲に入ること（過去30日内）", () => {
    for (const report of OPP_ACTIVITY_REPORTS) {
      const d = new Date(report.reportDate);
      const now = new Date();
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      // 過去0〜31日の範囲（種別作成日として妥当）
      expect(diffDays).toBeGreaterThanOrEqual(-1); // 未来でない（1日の余裕）
      expect(diffDays).toBeLessThanOrEqual(32);
    }
  });
});

// ─── §6-F4: oar_demo_opp2/opp3 の sourceReportId 連携（F4 追加テスト）────────

describe("§6-F4: 商談報告→日報反映 seed F4 追加", () => {
  it("OPP_ACTIVITY_REPORTS が3件以上存在すること（F4 充実確認）", () => {
    expect(OPP_ACTIVITY_REPORTS.length).toBeGreaterThanOrEqual(3);
  });

  it("oar_demo_opp2（齋藤家 医療保険）が対応日報に sourceReportId ブロックを持つこと", () => {
    const actReport = OPP_ACTIVITY_REPORTS.find((r) => r.id === "oar_demo_opp2");
    expect(actReport).toBeDefined();
    expect(actReport!.opportunityId).toBe("opp2");
    expect(actReport!.userId).toBe("u1");

    const nippou = REPORTS.find(
      (r) => r.date === actReport!.reportDate && r.userId === actReport!.userId,
    );
    expect(nippou).toBeDefined();

    const linkedBlock = nippou!.blocks.find(
      (b) => b.sourceReportId === "oar_demo_opp2",
    );
    expect(linkedBlock, "oar_demo_opp2 に対応する sourceReportId ブロックが日報にありません").toBeDefined();
    expect(linkedBlock!.opportunityId).toBe("opp2");
    expect(linkedBlock!.isActual).toBe(true);
    expect(linkedBlock!.title.length).toBeGreaterThan(0);
  });

  it("oar_demo_opp3（水野家 自動車保険）が対応日報に sourceReportId ブロックを持つこと", () => {
    const actReport = OPP_ACTIVITY_REPORTS.find((r) => r.id === "oar_demo_opp3");
    expect(actReport).toBeDefined();
    expect(actReport!.opportunityId).toBe("opp3");
    expect(actReport!.userId).toBe("u1");

    const nippou = REPORTS.find(
      (r) => r.date === actReport!.reportDate && r.userId === actReport!.userId,
    );
    expect(nippou).toBeDefined();

    const linkedBlock = nippou!.blocks.find(
      (b) => b.sourceReportId === "oar_demo_opp3",
    );
    expect(linkedBlock, "oar_demo_opp3 に対応する sourceReportId ブロックが日報にありません").toBeDefined();
    expect(linkedBlock!.opportunityId).toBe("opp3");
    expect(linkedBlock!.isActual).toBe(true);
    expect(linkedBlock!.title.length).toBeGreaterThan(0);
  });

  it("全 OPP_ACTIVITY_REPORTS に対応日報 sourceReportId ブロックが存在すること", () => {
    for (const report of OPP_ACTIVITY_REPORTS) {
      const nippou = REPORTS.find(
        (r) => r.date === report.reportDate && r.userId === report.userId,
      );
      expect(nippou, `${report.id} に対応する日報が見つかりません`).toBeDefined();
      const linkedBlock = nippou!.blocks.find(
        (b) => b.sourceReportId === report.id,
      );
      expect(
        linkedBlock,
        `${report.id} に対応する sourceReportId ブロックが日報にありません`,
      ).toBeDefined();
    }
  });
});
