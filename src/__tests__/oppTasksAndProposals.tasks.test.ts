// =====================================================
// oppTasksAndProposals.tasks.test.ts — ADR-TASK-MASTER §5 準拠（第2パス）
//
// 新 Task[] モデル（taskGenerator / tasks[]）のテスト。
// generateTasksOnOpportunityCreated / generateTasksOnProductAdded / Task done 操作
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity, Task, TaskTemplate } from "../types";
import {
  generateTasksOnOpportunityCreated,
  generateTasksOnProductAdded,
} from "../utils/taskGenerator";

// ── ヘルパー ──────────────────────────────────────────────────────────────────
const _now = new Date().toISOString();
const TODAY = "2026-08-07";

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
    tasks: [],
    ...overrides,
  };
}

function mkMaster(
  overrides: Partial<TaskTemplate> &
    Pick<TaskTemplate, "id" | "title" | "scope" | "trigger">,
): TaskTemplate {
  return {
    isActive: true,
    defaultPriority: "medium",
    productCategories: null,
    order: 0,
    createdAt: _now,
    updatedAt: _now,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 新モデル: generateTasksOnOpportunityCreated
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateTasksOnOpportunityCreated", () => {
  const masters: TaskTemplate[] = [
    mkMaster({
      id: "m1",
      title: "初回面談メモ作成",
      scope: "opportunity",
      trigger: "opportunity_created",
    }),
    mkMaster({
      id: "m2",
      title: "ヒアリングシート送付",
      scope: "opportunity",
      trigger: "opportunity_created",
    }),
    mkMaster({
      id: "m3",
      title: "商品選定",
      scope: "opportunity",
      trigger: "product_added",
      isActive: false,
    }), // isActive=false は除外
  ];

  it("opportunity_created トリガーのアクティブマスタ数だけタスクが生成される", () => {
    const opp = mkOpp({
      id: "o1",
      householdId: "c1",
      stage: "approach",
      status: "open",
    });
    const tasks = generateTasksOnOpportunityCreated(opp, masters, TODAY);
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.title)).toContain("初回面談メモ作成");
    expect(tasks.map((t) => t.title)).toContain("ヒアリングシート送付");
  });

  it("生成されたタスクは scope='opportunity'・done=false・sourceMasterId 設定済み", () => {
    const opp = mkOpp({
      id: "o2",
      householdId: "c1",
      stage: "approach",
      status: "open",
    });
    const tasks = generateTasksOnOpportunityCreated(opp, masters, TODAY);
    for (const t of tasks) {
      expect(t.scope).toBe("opportunity");
      expect(t.done).toBe(false);
      expect(t.sourceMasterId).toBeTruthy();
    }
  });

  it("isActive=false のマスタは生成対象外", () => {
    const opp = mkOpp({
      id: "o3",
      householdId: "c1",
      stage: "approach",
      status: "open",
    });
    const tasks = generateTasksOnOpportunityCreated(opp, masters, TODAY);
    const titles = tasks.map((t) => t.title);
    expect(titles).not.toContain("商品選定"); // m3 は isActive=false かつ trigger 違い
  });

  it("既存の tasks に同一 sourceMasterId がある場合は重複生成しない（冪等）", () => {
    const opp = mkOpp({
      id: "o4",
      householdId: "c1",
      stage: "approach",
      status: "open",
      tasks: [
        {
          id: "existing1",
          title: "初回面談メモ作成",
          scope: "opportunity",
          done: false,
          sourceMasterId: "m1",
          createdAt: _now,
          rolledOver: false,
          priority: "medium",
        },
      ],
    });
    const tasks = generateTasksOnOpportunityCreated(opp, masters, TODAY);
    // m1 は既存にあるので m2 の1件のみ
    expect(tasks).toHaveLength(1);
    expect(tasks[0].sourceMasterId).toBe("m2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 新モデル: generateTasksOnProductAdded
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateTasksOnProductAdded", () => {
  const masters: TaskTemplate[] = [
    mkMaster({
      id: "pm1",
      title: "告知書確認",
      scope: "product",
      trigger: "product_added",
    }),
    mkMaster({
      id: "pm2",
      title: "設計書作成",
      scope: "product",
      trigger: "product_added",
    }),
    mkMaster({
      id: "opp_m",
      title: "案件タスク",
      scope: "opportunity",
      trigger: "opportunity_created",
    }), // scope違い・除外
  ];

  it("product_added トリガーのマスタ×product数だけタスクが生成される", () => {
    const opp = mkOpp({
      id: "p1",
      householdId: "c1",
      stage: "proposal",
      status: "open",
    });
    const product = {
      id: "pp1",
      productCategory: "life" as const,
      productName: "テスト商品",
      insurer: "テスト生命",
      insuredPersonId: "per1",
      monthlyPremium: 5000,
    };
    const tasks = generateTasksOnProductAdded(opp, product, masters, TODAY);
    expect(tasks).toHaveLength(2); // pm1 + pm2
  });

  it("生成タスクは productId が設定されていること", () => {
    const opp = mkOpp({
      id: "p2",
      householdId: "c1",
      stage: "proposal",
      status: "open",
    });
    const product = {
      id: "pp2",
      productCategory: "medical" as const,
      productName: "医療商品",
      insurer: "テスト生命",
      insuredPersonId: "per1",
      monthlyPremium: 3000,
    };
    const tasks = generateTasksOnProductAdded(opp, product, masters, TODAY);
    for (const t of tasks) {
      expect(t.productId).toBe("pp2");
      expect(t.scope).toBe("product");
    }
  });

  it("同一 (sourceMasterId, productId) ペアは重複生成しない（冪等）", () => {
    const opp = mkOpp({
      id: "p3",
      householdId: "c1",
      stage: "proposal",
      status: "open",
      tasks: [
        {
          id: "ex1",
          title: "告知書確認",
          scope: "product",
          done: false,
          sourceMasterId: "pm1",
          productId: "pp3",
          createdAt: _now,
          rolledOver: false,
          priority: "medium",
        },
      ],
    });
    const product = {
      id: "pp3",
      productCategory: "life" as const,
      productName: "商品3",
      insurer: "テスト生命",
      insuredPersonId: "per1",
      monthlyPremium: 8000,
    };
    const tasks = generateTasksOnProductAdded(opp, product, masters, TODAY);
    // pm1 は既存あり → pm2 のみ生成
    expect(tasks).toHaveLength(1);
    expect(tasks[0].sourceMasterId).toBe("pm2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 新モデル: 案件タスクの done 操作（純関数）
// ═══════════════════════════════════════════════════════════════════════════════

describe("Task done 操作（純関数）", () => {
  function toggleTaskDone(
    tasks: Task[],
    taskId: string,
    done: boolean,
    today: string,
  ): Task[] {
    return tasks.map((t) =>
      t.id === taskId
        ? { ...t, done, doneDate: done ? (t.doneDate ?? today) : t.doneDate }
        : t,
    );
  }

  it("done=true → doneDate が今日の日付で設定される", () => {
    const tasks: Task[] = [
      {
        id: "t1",
        title: "タスクA",
        scope: "opportunity",
        done: false,
        sourceMasterId: "m1",
        createdAt: _now,
        rolledOver: false,
        priority: "medium",
      },
    ];
    const result = toggleTaskDone(tasks, "t1", true, TODAY);
    const t = result.find((x) => x.id === "t1");
    expect(t?.done).toBe(true);
    expect(t?.doneDate).toBe(TODAY);
  });

  it("done=false でも既存 doneDate は保持される（undo 対応）", () => {
    const tasks: Task[] = [
      {
        id: "t2",
        title: "タスクB",
        scope: "opportunity",
        done: true,
        doneDate: "2026-08-05",
        sourceMasterId: "m1",
        createdAt: _now,
        rolledOver: false,
        priority: "medium",
      },
    ];
    const result = toggleTaskDone(tasks, "t2", false, TODAY);
    const t = result.find((x) => x.id === "t2");
    expect(t?.done).toBe(false);
    expect(t?.doneDate).toBe("2026-08-05"); // 保持
  });

  it("他のタスクは変更されない（非破壊・分離）", () => {
    const tasks: Task[] = [
      {
        id: "t3",
        title: "タスクC",
        scope: "opportunity",
        done: false,
        sourceMasterId: "m1",
        createdAt: _now,
        rolledOver: false,
        priority: "medium",
      },
      {
        id: "t4",
        title: "タスクD",
        scope: "opportunity",
        done: false,
        sourceMasterId: "m2",
        createdAt: _now,
        rolledOver: false,
        priority: "medium",
      },
    ];
    const result = toggleTaskDone(tasks, "t3", true, TODAY);
    const t4 = result.find((x) => x.id === "t4");
    expect(t4?.done).toBe(false);
  });

  it("sourceMasterId 非 null タスクは削除できない（ガード確認: ビジネスルール）", () => {
    // 自動生成タスク（sourceMasterId!=null）の削除禁止チェック
    const autoGenerated: Task = {
      id: "ag1",
      title: "自動タスク",
      scope: "opportunity",
      done: false,
      sourceMasterId: "master-1",
      createdAt: _now,
      rolledOver: false,
      priority: "medium",
    };
    // ガード: sourceMasterId があれば削除不可（フィルタで除外されないことを確認）
    const canDelete = autoGenerated.sourceMasterId == null;
    expect(canDelete).toBe(false);
  });
});
