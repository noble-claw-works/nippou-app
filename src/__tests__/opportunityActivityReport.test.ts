// =====================================================
// opportunityActivityReport.test.ts
// ADR-B4 v2 要件6 + 要件9
//
// テスト観点:
//   § 1. OpportunityActivityReport CRUD (add/get/update/delete)
//   § 2. syncOppReportToNippou: 日報 TimeBlock 自動生成（二重生成しない）
//   § 3. reachedMilestones → milestones 日付記録 → ステージ自動遷移
//   § 4. localStorage 永続（nippou.oppActivityReports.v1）
//   § 5. resetAll で oppActivityReports がクリアされる
// =====================================================
import { describe, it, expect, beforeEach, vi } from "vitest";

// jsdom 環境なので localStorage は利用可能
// Zustand ストアを直接インポートして毎テスト前にリセット

// ─── Zustand store のリセットヘルパー ────────────────────────────────────────
// NOTE: importを遅延させてローカルストレージモックを先に確立する
let useAppStore: typeof import("../store").useAppStore;

beforeEach(async () => {
  // localStorage をクリア（テスト間の汚染を防止）
  window.localStorage.clear();
  vi.resetModules();
  const mod = await import("../store");
  useAppStore = mod.useAppStore;
  // ストアをリセット
  useAppStore.getState().resetAll();
});

// ─── § 1. CRUD ─────────────────────────────────────────────────────────────
describe("§1. OpportunityActivityReport CRUD", () => {
  it("addOppActivityReport: 新規報告が追加され id が付与される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];
    expect(opp).toBeDefined();

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "テスト面談",
    });

    expect(created.id).toBeTruthy();
    expect(created.opportunityId).toBe(opp.id);
    expect(created.summary).toBe("テスト面談");
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });

  it("getOppActivityReport: 同じ案件・日付・ユーザーで取得できる", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "phone",
      summary: "電話連絡",
    });

    const found = useAppStore
      .getState()
      .getOppActivityReport(opp.id, "2026-08-07", "u1");
    expect(found).toBeDefined();
    expect(found!.summary).toBe("電話連絡");
  });

  it("getOppActivityReport: 違う日付では取得できない", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "テスト",
    });

    const notFound = useAppStore
      .getState()
      .getOppActivityReport(opp.id, "2026-08-06", "u1");
    expect(notFound).toBeUndefined();
  });

  it("updateOppActivityReport: summary が更新される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "旧サマリ",
    });

    useAppStore
      .getState()
      .updateOppActivityReport(created.id, { summary: "新サマリ" });

    const updated = useAppStore
      .getState()
      .oppActivityReports.find((r) => r.id === created.id);
    expect(updated!.summary).toBe("新サマリ");
    expect(
      updated!.updatedAt > created.updatedAt ||
        updated!.updatedAt === created.updatedAt,
    ).toBe(true);
  });

  it("deleteOppActivityReport: 削除後は一覧から消える", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "削除テスト",
    });

    useAppStore.getState().deleteOppActivityReport(created.id);
    const still = useAppStore
      .getState()
      .oppActivityReports.find((r) => r.id === created.id);
    expect(still).toBeUndefined();
  });

  it("getOppActivityReportsByOpportunity: 案件 ID でフィルタされる", async () => {
    const s = useAppStore.getState();
    const opp1 = s.opportunities[0];
    const opp2 = s.opportunities[1];
    expect(opp1).toBeDefined();
    expect(opp2).toBeDefined();

    s.addOppActivityReport({
      opportunityId: opp1.id,
      userId: "u1",
      reportDate: "2026-08-05",
      activityType: "visit",
      summary: "A案件",
    });
    s.addOppActivityReport({
      opportunityId: opp2.id,
      userId: "u1",
      reportDate: "2026-08-05",
      activityType: "phone",
      summary: "B案件",
    });
    s.addOppActivityReport({
      opportunityId: opp1.id,
      userId: "u1",
      reportDate: "2026-08-06",
      activityType: "web",
      summary: "A案件2",
    });

    const forOpp1 = useAppStore
      .getState()
      .getOppActivityReportsByOpportunity(opp1.id);
    expect(forOpp1).toHaveLength(2);
    expect(forOpp1.every((r) => r.opportunityId === opp1.id)).toBe(true);
  });
});

// ─── § 2. syncOppReportToNippou — TimeBlock 自動生成・二重生成しない ───────────
describe("§2. syncOppReportToNippou — 日報 TimeBlock 自動生成", () => {
  it("報告を保存すると当日日報に TimeBlock が追加される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "面談しました",
      nextAction: "次回提案資料送付",
    });

    useAppStore.getState().syncOppReportToNippou(created.id);

    const nippou = useAppStore
      .getState()
      .reports.find((r) => r.userId === "u1" && r.date === "2026-08-07");
    expect(nippou).toBeDefined();

    const block = nippou!.blocks.find((b) => b.sourceReportId === created.id);
    expect(block).toBeDefined();
    expect(block!.sourceReportId).toBe(created.id);
    expect(block!.opportunityId).toBe(opp.id);
    expect(block!.type).toBe("visit"); // activityType: visit → BlockType: visit
    expect(block!.isActual).toBe(true);
    expect(block!.title).toContain("面談しました");
  });

  it("同じ報告 ID で sync を2回呼んでも TimeBlock は1個しか増えない（二重生成しない）", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "phone",
      summary: "電話相談",
    });

    useAppStore.getState().syncOppReportToNippou(created.id);
    useAppStore.getState().syncOppReportToNippou(created.id);

    const nippou = useAppStore
      .getState()
      .reports.find((r) => r.userId === "u1" && r.date === "2026-08-07");
    const blocksFromReport = nippou!.blocks.filter(
      (b) => b.sourceReportId === created.id,
    );
    expect(blocksFromReport).toHaveLength(1); // 二重生成しない
  });

  it("報告を更新して sync すると既存 TimeBlock のタイトルが更新される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "初回サマリ",
    });

    useAppStore.getState().syncOppReportToNippou(created.id);

    // 更新
    useAppStore
      .getState()
      .updateOppActivityReport(created.id, { summary: "更新サマリ" });
    useAppStore.getState().syncOppReportToNippou(created.id);

    const nippou = useAppStore
      .getState()
      .reports.find((r) => r.userId === "u1" && r.date === "2026-08-07");
    const blocksFromReport = nippou!.blocks.filter(
      (b) => b.sourceReportId === created.id,
    );
    expect(blocksFromReport).toHaveLength(1); // 更新後も1個
    expect(blocksFromReport[0].title).toContain("更新サマリ");
  });

  it("activityType=phone → BlockType=call でTimeBlockが生成される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "phone",
      summary: "電話",
    });
    useAppStore.getState().syncOppReportToNippou(created.id);

    const nippou = useAppStore
      .getState()
      .reports.find((r) => r.userId === "u1" && r.date === "2026-08-07");
    const block = nippou!.blocks.find((b) => b.sourceReportId === created.id);
    expect(block!.type).toBe("phone");
  });

  it("activityType=web → BlockType=meeting でTimeBlockが生成される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "web",
      summary: "オンライン面談",
    });
    useAppStore.getState().syncOppReportToNippou(created.id);

    const nippou = useAppStore
      .getState()
      .reports.find((r) => r.userId === "u1" && r.date === "2026-08-07");
    const block = nippou!.blocks.find((b) => b.sourceReportId === created.id);
    expect(block!.type).toBe("meeting");
  });

  it("日報が存在しない日付でも createReport が呼ばれ TimeBlock が追加される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];
    const date = "2025-01-01"; // 存在しない日付

    const before = useAppStore
      .getState()
      .reports.find((r) => r.userId === "u1" && r.date === date);
    expect(before).toBeUndefined();

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: date,
      activityType: "visit",
      summary: "過去の面談",
    });
    useAppStore.getState().syncOppReportToNippou(created.id);

    const nippou = useAppStore
      .getState()
      .reports.find((r) => r.userId === "u1" && r.date === date);
    expect(nippou).toBeDefined();
    const block = nippou!.blocks.find((b) => b.sourceReportId === created.id);
    expect(block).toBeDefined();
  });

  it("存在しない reportId を sync しても何も起きない（エラーなし）", async () => {
    expect(() => {
      useAppStore.getState().syncOppReportToNippou("nonexistent_id");
    }).not.toThrow();
  });
});

// ─── § 3. reachedMilestones → milestones 日付記録 → ステージ自動遷移 ──────────
describe("§3. reachedMilestones → milestones 日付記録 → ステージ自動遷移", () => {
  it("firstConsult チェック → opp.milestones.firstConsultDate が reportDate に設定される", async () => {
    const s = useAppStore.getState();
    // milestones なし の案件を使う（approach ステージ）
    const opp = s.opportunities.find(
      (o) => !o.milestones?.firstConsultDate && o.status === "open",
    );
    expect(opp).toBeDefined();

    const reportDate = "2026-08-07";
    const created = s.addOppActivityReport({
      opportunityId: opp!.id,
      userId: "u1",
      reportDate,
      activityType: "visit",
      summary: "初回相談実施",
      reachedMilestones: { firstConsult: true },
    });
    useAppStore.getState().syncOppReportToNippou(created.id);

    const updated = useAppStore
      .getState()
      .opportunities.find((o) => o.id === opp!.id);
    expect(updated!.milestones?.firstConsultDate).toBe(reportDate);
  });

  it("proposal チェック → milestones.proposalDate が設定される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities.find(
      (o) => !o.milestones?.proposalDate && o.status === "open",
    );
    expect(opp).toBeDefined();

    const reportDate = "2026-08-07";
    const created = s.addOppActivityReport({
      opportunityId: opp!.id,
      userId: "u1",
      reportDate,
      activityType: "visit",
      summary: "提案書提出",
      reachedMilestones: { proposal: true },
    });
    useAppStore.getState().syncOppReportToNippou(created.id);

    const updated = useAppStore
      .getState()
      .opportunities.find((o) => o.id === opp!.id);
    expect(updated!.milestones?.proposalDate).toBe(reportDate);
  });

  it("既に milestones.proposalDate が設定済みなら上書きしない", async () => {
    const s = useAppStore.getState();
    // proposalDate が既にある案件
    const opp = s.opportunities.find((o) => o.milestones?.proposalDate != null);
    expect(opp).toBeDefined();

    const existingDate = opp!.milestones!.proposalDate!;
    const reportDate = "2026-08-07";

    const created = s.addOppActivityReport({
      opportunityId: opp!.id,
      userId: "u1",
      reportDate,
      activityType: "visit",
      summary: "再提案",
      reachedMilestones: { proposal: true },
    });
    useAppStore.getState().syncOppReportToNippou(created.id);

    // 既存の proposalDate は変わらないこと
    const updated = useAppStore
      .getState()
      .opportunities.find((o) => o.id === opp!.id);
    expect(updated!.milestones?.proposalDate).toBe(existingDate);
  });

  it("confidence 更新 → opp.confidence が反映される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities.find((o) => o.status === "open");
    expect(opp).toBeDefined();

    const created = s.addOppActivityReport({
      opportunityId: opp!.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "確度更新",
      confidence: "B",
    });
    useAppStore.getState().syncOppReportToNippou(created.id);

    const updated = useAppStore
      .getState()
      .opportunities.find((o) => o.id === opp!.id);
    expect(updated!.confidence).toBe("B");
  });
});

// ─── § 4. localStorage 永続 ──────────────────────────────────────────────────
describe("§4. localStorage 永続", () => {
  it("addOppActivityReport 後 localStorage に保存される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "永続テスト",
    });

    const raw = window.localStorage.getItem("nippou.oppActivityReports.v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(
      parsed.some((r: { summary: string }) => r.summary === "永続テスト"),
    ).toBe(true);
  });

  it("deleteOppActivityReport 後 localStorage から削除される", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    const created = s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "削除永続テスト",
    });

    useAppStore.getState().deleteOppActivityReport(created.id);

    const raw = window.localStorage.getItem("nippou.oppActivityReports.v1");
    const parsed = JSON.parse(raw!);
    expect(parsed.some((r: { id: string }) => r.id === created.id)).toBe(false);
  });
});

// ─── § 5. resetAll ───────────────────────────────────────────────────────────
describe("§5. resetAll で oppActivityReports がクリアされる", () => {
  it("resetAll 後は oppActivityReports が空配列になる", async () => {
    const s = useAppStore.getState();
    const opp = s.opportunities[0];

    s.addOppActivityReport({
      opportunityId: opp.id,
      userId: "u1",
      reportDate: "2026-08-07",
      activityType: "visit",
      summary: "リセット前",
    });

    expect(useAppStore.getState().oppActivityReports).toHaveLength(1);

    useAppStore.getState().resetAll();

    expect(useAppStore.getState().oppActivityReports).toHaveLength(0);

    const raw = window.localStorage.getItem("nippou.oppActivityReports.v1");
    expect(raw).toBeNull();
  });
});
