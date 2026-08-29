// =====================================================
// opportunityActivityReport.sync.test.ts
// ADR-B4 v2 要件6 + 要件9
//
// テスト観点:
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
