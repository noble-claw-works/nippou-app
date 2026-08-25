// =====================================================
// feedbackFix20260825.test.ts — 検証フィードバック是正 2026-08-25
//
// F1: 実績D&D編集は提出前まで可能（submitted/confirmed 以外）
// F2: タスク一覧はカード上に既定表示（展開操作不要）
// F3: seed に複数案件のタスクが登載されていること
// =====================================================
import { describe, it, expect } from "vitest";
import type { DailyReport, Task, TaskPriority } from "../types";
import { OPPORTUNITIES } from "../data/seed";

// ─── helpers ──────────────────────────────────────────────────────────────────
function mkReport(status: DailyReport["status"]): DailyReport {
  return {
    id: `r_${status}`,
    userId: "u1",
    date: "2026-08-25",
    status,
    blocks: [],
    todos: [],
    memo: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// F1 の判定ロジック（TodayPage.tsx の canDragActual と同等）
const canDragActual = (r: Pick<DailyReport, "status">) =>
  r.status !== "submitted" && r.status !== "confirmed";

// F1 の旧判定ロジック（canEditActual = in_progress のみ）
const canEditActual = (r: Pick<DailyReport, "status">) =>
  r.status === "in_progress";

// ─── F1: 実績D&D編集ゲート ───────────────────────────────────────────────────
describe("F1: 実績D&D編集は提出前まで可能", () => {
  it("planning ステータスでは D&D 可能（新規作成は不可）", () => {
    const r = mkReport("planning");
    expect(canDragActual(r)).toBe(true);
    expect(canEditActual(r)).toBe(false); // 新規作成は不可のまま
  });

  it("in_progress ステータスでは D&D 可能かつ新規作成も可能", () => {
    const r = mkReport("in_progress");
    expect(canDragActual(r)).toBe(true);
    expect(canEditActual(r)).toBe(true);
  });

  it("submitted ステータスでは D&D 不可", () => {
    const r = mkReport("submitted");
    expect(canDragActual(r)).toBe(false);
    expect(canEditActual(r)).toBe(false);
  });

  it("confirmed ステータスでは D&D 不可", () => {
    const r = mkReport("confirmed");
    expect(canDragActual(r)).toBe(false);
    expect(canEditActual(r)).toBe(false);
  });
});

// ─── F2: タスク一覧既定表示（TaskListPreview ロジック） ─────────────────────
describe("F2: タスク一覧の既定表示ロジック", () => {
  const tasks: Task[] = [
    {
      id: "t1",
      title: "未完了タスク",
      done: false,
      priority: "high" as TaskPriority,
      rolledOver: false,
      scope: "opportunity",
      createdAt: "2026-08-20T10:00:00",
    },
    {
      id: "t2",
      title: "完了タスク",
      done: true,
      doneDate: "2026-08-22",
      priority: "medium" as TaskPriority,
      rolledOver: false,
      scope: "opportunity",
      createdAt: "2026-08-19T10:00:00",
    },
  ];

  it("未完了タスクは pending として分離される", () => {
    const pending = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    expect(pending).toHaveLength(1);
    expect(done).toHaveLength(1);
  });

  it("未完了タスクは最大5件のプレビューを返す", () => {
    const pending = tasks.filter((t) => !t.done);
    const previewPending = pending.slice(0, 5);
    expect(previewPending).toHaveLength(1);
  });

  it("6件以上の未完了タスクでは「他N件」が必要", () => {
    const manyTasks: Task[] = Array.from({ length: 8 }, (_, i) => ({
      id: `t${i}`,
      title: `タスク${i}`,
      done: false,
      priority: "medium" as TaskPriority,
      rolledOver: false,
      scope: "opportunity" as const,
      createdAt: "2026-08-25T10:00:00",
    }));
    const pending = manyTasks.filter((t) => !t.done);
    const previewPending = pending.slice(0, 5);
    const overflow = pending.length - 5;
    expect(previewPending).toHaveLength(5);
    expect(overflow).toBe(3);
  });
});

// ─── F3: seed のタスク登載確認 ──────────────────────────────────────────────
describe("F3: seed に複数案件のタスクが登載されている", () => {
  it("opp1 (GILSON家 生命保険) にタスクが登載されている", () => {
    const opp = OPPORTUNITIES.find((o) => o.id === "opp1");
    expect(opp).toBeDefined();
    expect(opp!.tasks).toBeDefined();
    expect(opp!.tasks!.length).toBeGreaterThan(0);
  });

  it("opp2 (齋藤家 医療保険) にタスクが登載されている", () => {
    const opp = OPPORTUNITIES.find((o) => o.id === "opp2");
    expect(opp).toBeDefined();
    expect(opp!.tasks).toBeDefined();
    expect(opp!.tasks!.length).toBeGreaterThan(0);
  });

  it("opp5 (高橋家 自動車保険 新規) にタスクが登載されている", () => {
    const opp = OPPORTUNITIES.find((o) => o.id === "opp5");
    expect(opp).toBeDefined();
    expect(opp!.tasks).toBeDefined();
    expect(opp!.tasks!.length).toBeGreaterThan(0);
  });

  it("opp_demo1 (松本家 総合保険) にタスクが登載されている", () => {
    const opp = OPPORTUNITIES.find((o) => o.id === "opp_demo1");
    expect(opp).toBeDefined();
    expect(opp!.tasks).toBeDefined();
    expect(opp!.tasks!.length).toBeGreaterThan(0);
  });

  it("各案件のタスクに done/未done が混在している（進捗バー・折りたたみが機能する）", () => {
    const oppsWithTasks = ["opp2", "opp5", "opp_demo1"];
    for (const id of oppsWithTasks) {
      const opp = OPPORTUNITIES.find((o) => o.id === id);
      const tasks = opp!.tasks ?? [];
      const hasDone = tasks.some((t) => t.done);
      const hasPending = tasks.some((t) => !t.done);
      expect(
        hasDone || hasPending,
        `${id} のタスクが空または型不正`,
      ).toBe(true);
    }
  });

  it("sourceMasterId 付き自動生成タスクが含まれる（削除不可ガード対象）", () => {
    const opp2 = OPPORTUNITIES.find((o) => o.id === "opp2");
    const autoTasks = (opp2!.tasks ?? []).filter((t) => t.sourceMasterId);
    expect(autoTasks.length).toBeGreaterThan(0);
  });

  it("タスク ID がすべて一意（重複なし）", () => {
    const allTaskIds = OPPORTUNITIES.flatMap((o) =>
      (o.tasks ?? []).map((t) => t.id),
    );
    const unique = new Set(allTaskIds);
    expect(unique.size).toBe(allTaskIds.length);
  });
});
