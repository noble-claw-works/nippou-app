// =====================================================
// notificationGen.test.ts — G1 通知生成の単体テスト
// addNotification / commentSlice / reportSlice の通知差込を検証
// =====================================================
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../store";
import {
  reportOwnerIdOf,
  reportOwnerIdByDayKey,
  managerIdsFor,
} from "../store/_slices/notificationGen";
import type { DailyReport } from "../types";

// =====================================================
// ヘルパー
// =====================================================

function makeReport(overrides: Partial<DailyReport> = {}): DailyReport {
  return {
    id: "rep1",
    userId: "u1",
    date: "2026-09-17",
    status: "submitted",
    mainTheme: "",
    monthlyTheme: "",
    dailyTheme: "",
    blocks: [],
    todos: [],
    customerVisits: [],
    gratitude: ["", "", ""],
    morningMood: null,
    eveningMood: null,
    managerSignal: null,
    selfComment: "",
    comments: [],
    attachments: [],
    createdAt: "2026-09-17T09:00:00.000Z",
    updatedAt: "2026-09-17T09:00:00.000Z",
    ...overrides,
  };
}

// =====================================================
// 純関数ヘルパーのテスト
// =====================================================

describe("reportOwnerIdOf", () => {
  const reports = [
    makeReport({ id: "r1", userId: "u1" }),
    makeReport({ id: "r2", userId: "u3" }),
  ];

  it("reportId が一致する日報の userId を返す", () => {
    expect(reportOwnerIdOf(reports, "r1")).toBe("u1");
    expect(reportOwnerIdOf(reports, "r2")).toBe("u3");
  });

  it("存在しない reportId は undefined を返す", () => {
    expect(reportOwnerIdOf(reports, "r99")).toBeUndefined();
  });
});

describe("reportOwnerIdByDayKey", () => {
  const reports = [
    makeReport({ id: "r1", userId: "u1", date: "2026-09-17" }),
    makeReport({ id: "r2", userId: "u2", date: "2026-09-18" }),
  ];

  it("dayKey に一致する最初の日報の userId を返す", () => {
    expect(reportOwnerIdByDayKey(reports, "2026-09-17")).toBe("u1");
  });

  it("存在しない dayKey は undefined を返す", () => {
    expect(reportOwnerIdByDayKey(reports, "2099-01-01")).toBeUndefined();
  });
});

describe("managerIdsFor", () => {
  const teams = [
    {
      id: "t1",
      name: "営業1課",
      description: "",
      managerIds: ["u4"],
      memberIds: ["u1", "u3"],
    },
    {
      id: "t2",
      name: "営業2課",
      description: "",
      managerIds: ["u5"],
      memberIds: ["u2"],
    },
  ];
  const users = [
    {
      id: "u1",
      name: "霧島",
      email: "a@x.com",
      role: "general" as const,
      teamIds: ["t1"],
      status: "active" as const,
      lastLogin: "",
      avatarInitials: "霧",
    },
    {
      id: "u2",
      name: "田中",
      email: "b@x.com",
      role: "general" as const,
      teamIds: ["t2"],
      status: "active" as const,
      lastLogin: "",
      avatarInitials: "田",
    },
    {
      id: "u9",
      name: "不在",
      email: "c@x.com",
      role: "general" as const,
      teamIds: [],
      status: "active" as const,
      lastLogin: "",
      avatarInitials: "不",
    },
  ];

  it("u1 の上長は t1.managerIds = [u4]", () => {
    expect(managerIdsFor(teams, users, "u1")).toEqual(["u4"]);
  });

  it("teamIds が空のユーザーは空配列を返す", () => {
    expect(managerIdsFor(teams, users, "u9")).toEqual([]);
  });

  it("存在しない userId は空配列を返す", () => {
    expect(managerIdsFor(teams, users, "u999")).toEqual([]);
  });
});

// =====================================================
// addNotification の動作テスト（Zustandストア）
// =====================================================

describe("addNotification", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("notification が1件増える", () => {
    const before = useAppStore.getState().notifications.length;
    useAppStore.getState().addNotification({
      userId: "u1",
      type: "comment",
      title: "テスト",
      body: "本文",
    });
    const after = useAppStore.getState().notifications.length;
    expect(after).toBe(before + 1);
  });

  it("正しい型・宛先・isRead=false で追加される", () => {
    useAppStore.getState().addNotification({
      userId: "u2",
      type: "confirmed",
      title: "確認完了",
      body: "日報確認済み",
      relatedReportId: "rep_x",
    });
    const notifs = useAppStore.getState().notifications;
    const n = notifs[notifs.length - 1];
    expect(n.userId).toBe("u2");
    expect(n.type).toBe("confirmed");
    expect(n.title).toBe("確認完了");
    expect(n.isRead).toBe(false);
    expect(n.relatedReportId).toBe("rep_x");
  });
});

// =====================================================
// confirmReport → 対象日報オーナーへ confirmed 通知
// =====================================================

describe("confirmReport → 通知", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("confirmReport 後に日報オーナー宛 confirmed 通知が1件生成される", () => {
    const state = useAppStore.getState();

    // u1(霧島) の日報を作成して submitted に
    const report = state.createReport("u1", "2026-09-17");
    state.confirmPlanning(report.id);
    state.submitReport(report.id);

    const beforeCount = useAppStore
      .getState()
      .notifications.filter(
        (n) => n.type === "confirmed" && n.userId === "u1",
      ).length;

    // u4(佐藤=manager) として確認
    useAppStore.setState({ currentUserId: "u4", currentRole: "manager" });
    useAppStore.getState().confirmReport(report.id);

    const afterCount = useAppStore
      .getState()
      .notifications.filter(
        (n) => n.type === "confirmed" && n.userId === "u1",
      ).length;
    expect(afterCount).toBe(beforeCount + 1);
  });
});

// =====================================================
// withdrawReport(by='manager') → 差戻し通知
// =====================================================

describe("withdrawReport → 通知", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("by='manager' で差戻し通知が生成される", () => {
    const state = useAppStore.getState();
    const report = state.createReport("u1", "2026-09-18");
    state.confirmPlanning(report.id);
    state.submitReport(report.id);

    const before = useAppStore
      .getState()
      .notifications.filter(
        (n) => n.type === "sent_back" && n.userId === "u1",
      ).length;

    useAppStore.getState().withdrawReport(report.id, "manager");

    const after = useAppStore
      .getState()
      .notifications.filter(
        (n) => n.type === "sent_back" && n.userId === "u1",
      ).length;
    expect(after).toBe(before + 1);
  });

  it("by='self' では差戻し通知が生成されない", () => {
    const state = useAppStore.getState();
    const report = state.createReport("u1", "2026-09-19");
    state.confirmPlanning(report.id);
    state.submitReport(report.id);

    const before = useAppStore
      .getState()
      .notifications.filter((n) => n.type === "sent_back").length;

    useAppStore.getState().withdrawReport(report.id, "self");

    const after = useAppStore
      .getState()
      .notifications.filter((n) => n.type === "sent_back").length;
    expect(after).toBe(before); // 増えない
  });

  it("by 未指定でも通知は生成されない（後方互換）", () => {
    const state = useAppStore.getState();
    const report = state.createReport("u1", "2026-09-20");
    state.confirmPlanning(report.id);
    state.submitReport(report.id);

    const before = useAppStore
      .getState()
      .notifications.filter((n) => n.type === "sent_back").length;

    useAppStore.getState().withdrawReport(report.id);

    const after = useAppStore
      .getState()
      .notifications.filter((n) => n.type === "sent_back").length;
    expect(after).toBe(before); // 増えない
  });
});

// =====================================================
// addManagerComment → 日報オーナー宛 comment 通知
// =====================================================

describe("addManagerComment → 通知", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("上長が u1 の日報にコメントすると u1 宛 comment 通知が生成される", () => {
    const state = useAppStore.getState();
    state.createReport("u1", "2026-09-17");

    const before = useAppStore
      .getState()
      .notifications.filter(
        (n) => n.type === "comment" && n.userId === "u1",
      ).length;

    useAppStore
      .getState()
      .addManagerComment("2026-09-17", "u4", "よく頑張りました", "manager");

    const after = useAppStore
      .getState()
      .notifications.filter(
        (n) => n.type === "comment" && n.userId === "u1",
      ).length;
    expect(after).toBe(before + 1);
  });

  it("自分の日報に自分でコメントした場合は通知不要（authorUserId === ownerId）", () => {
    const state = useAppStore.getState();
    state.createReport("u1", "2026-09-21");

    const before = useAppStore
      .getState()
      .notifications.filter((n) => n.type === "comment").length;

    useAppStore
      .getState()
      .addManagerComment("2026-09-21", "u1", "自分メモ", "general");

    const after = useAppStore
      .getState()
      .notifications.filter((n) => n.type === "comment").length;
    expect(after).toBe(before); // 自分コメントは通知しない
  });
});

// =====================================================
// markNotificationRead（既存機能の回帰）
// =====================================================

describe("markNotificationRead (既存機能回帰)", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("addNotification → markRead → isRead=true", () => {
    useAppStore.getState().addNotification({
      userId: "u1",
      type: "reminder",
      title: "リマインダー",
      body: "定期確認",
    });
    const notifs = useAppStore.getState().notifications;
    const n = notifs[notifs.length - 1];
    expect(n.isRead).toBe(false);

    useAppStore.getState().markNotificationRead(n.id);
    const updated = useAppStore
      .getState()
      .notifications.find((x) => x.id === n.id);
    expect(updated?.isRead).toBe(true);
  });
});
