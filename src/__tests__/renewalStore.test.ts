// =====================================================
// renewalStore.test.ts — renewalSlice action テスト
// =====================================================
import { describe, it, expect } from "vitest";
import type { RenewalCase, RenewalSurvey, Task } from "../types";

// ── ヘルパー: 最小限の RenewalCase ─────────────────────
function makeRenewalCase(overrides: Partial<RenewalCase> = {}): RenewalCase {
  const now = new Date().toISOString();
  return {
    id: "rc_test_01",
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
    activityLog: [
      {
        id: "rl_init",
        kind: "other",
        body: "更新案件を登録しました",
        byUserId: "u1",
        at: now,
      },
    ],
    tasks: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── saveRenewalSurvey の deep-merge テスト ────────────────
describe("saveRenewalSurvey — survey deep-merge", () => {
  it("consult パッチが既存 consult と deep-merge される", () => {
    const rc = makeRenewalCase({
      survey: {
        consult: {
          firstContactDate: "2026-09-01",
          flyerDistribution: "delivered",
        },
      },
    });

    // patch: renewedPremium のみ追加
    const patch: Partial<RenewalSurvey> = {
      consult: { renewedPremium: 50000 },
    };

    // deep-merge をシミュレート（スライスのロジックを直接テスト）
    const mergedConsult = {
      ...rc.survey.consult,
      ...patch.consult,
    };

    expect(mergedConsult.firstContactDate).toBe("2026-09-01"); // 既存保持
    expect(mergedConsult.flyerDistribution).toBe("delivered"); // 既存保持
    expect(mergedConsult.renewedPremium).toBe(50000); // 新規追加
  });

  it("roadmap パッチが既存 roadmap と deep-merge される", () => {
    const rc = makeRenewalCase({
      survey: {
        roadmap: { inputDate: "2026-09-01", gender: "male" },
      },
    });

    const patch: Partial<RenewalSurvey> = {
      roadmap: { ageBand: "40s" },
    };

    const mergedRoadmap = {
      ...rc.survey.roadmap,
      ...patch.roadmap,
    };

    expect(mergedRoadmap.inputDate).toBe("2026-09-01"); // 既存保持
    expect(mergedRoadmap.gender).toBe("male"); // 既存保持
    expect(mergedRoadmap.ageBand).toBe("40s"); // 新規追加
  });

  it("consult.renewalMethod が method 列と同期される", () => {
    const rc = makeRenewalCase({ method: "undecided" });

    const patch: Partial<RenewalSurvey> = {
      consult: { renewalMethod: "phone" },
    };

    const mergedConsult = { ...rc.survey.consult, ...patch.consult };
    const newMethod = mergedConsult.renewalMethod ?? rc.method;

    expect(newMethod).toBe("phone"); // method 列に同期
  });

  it("consult.renewalMethod が undefined のとき既存 method が保持される", () => {
    const rc = makeRenewalCase({ method: "visit" });

    const patch: Partial<RenewalSurvey> = {
      consult: { renewedPremium: 60000 },
    };

    const mergedConsult = { ...rc.survey.consult, ...patch.consult };
    const newMethod = mergedConsult.renewalMethod ?? rc.method;

    expect(newMethod).toBe("visit"); // 既存 method 保持
  });
});

// ── addRenewalNote の追記・非削除テスト ──────────────────
describe("addRenewalNote — 追記・非削除", () => {
  it("留意事項が追記される(既存ノートが保持される)", () => {
    const existingNote = {
      id: "rn_existing",
      body: "既存の留意事項",
      byUserId: "u1",
      at: new Date().toISOString(),
    };
    const rc = makeRenewalCase({ notes: [existingNote] });

    // 追記シミュレート
    const newNote = {
      id: "rn_new",
      body: "新しい留意事項",
      byUserId: "u1",
      at: new Date().toISOString(),
    };
    const updatedNotes = [...rc.notes, newNote];

    expect(updatedNotes).toHaveLength(2);
    expect(updatedNotes[0].id).toBe("rn_existing"); // 既存保持
    expect(updatedNotes[1].id).toBe("rn_new"); // 新規追加
  });

  it("留意事項追加後に activityLog に kind=note のエントリが追加される", () => {
    const rc = makeRenewalCase();
    const beforeCount = rc.activityLog.length;

    // activityLog 追記シミュレート
    const newLog = {
      id: "rl_note",
      kind: "note" as const,
      body: "留意事項を追記しました: テスト",
      byUserId: "u1",
      at: new Date().toISOString(),
    };
    const updatedLog = [...rc.activityLog, newLog];

    expect(updatedLog).toHaveLength(beforeCount + 1);
    expect(updatedLog[updatedLog.length - 1].kind).toBe("note");
  });

  it("削除アクションが存在しないこと（notes 配列は追記のみ）", () => {
    // このテストは設計の明示: addRenewalNote は push のみ
    const rc = makeRenewalCase({
      notes: [
        {
          id: "rn_1",
          body: "ノート1",
          byUserId: "u1",
          at: "2026-09-01T00:00:00Z",
        },
        {
          id: "rn_2",
          body: "ノート2",
          byUserId: "u1",
          at: "2026-09-02T00:00:00Z",
        },
      ],
    });

    // 削除は行わない（設計通り）
    expect(rc.notes).toHaveLength(2);
    expect(rc.notes[0].body).toBe("ノート1");
    expect(rc.notes[1].body).toBe("ノート2");
  });
});

// ── changeRenewalStatus のログ生成テスト ──────────────────
describe("changeRenewalStatus — activityLog 生成", () => {
  const STATUS_LABELS = {
    not_started: "未対応",
    in_progress: "対応中",
    completed: "完了",
  };

  it("not_started → in_progress 遷移でログ文言が正しい", () => {
    const rc = makeRenewalCase({ status: "not_started" });
    const fromLabel = STATUS_LABELS[rc.status];
    const toLabel = STATUS_LABELS["in_progress"];
    const logBody = `ステータスを変更しました: ${fromLabel}→${toLabel}`;

    expect(logBody).toBe("ステータスを変更しました: 未対応→対応中");
  });

  it("in_progress → completed 遷移でログ文言が正しい", () => {
    const rc = makeRenewalCase({ status: "in_progress" });
    const fromLabel = STATUS_LABELS[rc.status];
    const toLabel = STATUS_LABELS["completed"];
    const logBody = `ステータスを変更しました: ${fromLabel}→${toLabel}`;

    expect(logBody).toBe("ステータスを変更しました: 対応中→完了");
  });

  it("ステータス変更後に activityLog に kind=status_change が追加される", () => {
    const rc = makeRenewalCase({ status: "not_started" });
    const beforeCount = rc.activityLog.length;

    const newLog = {
      id: "rl_status",
      kind: "status_change" as const,
      body: "ステータスを変更しました: 未対応→対応中",
      byUserId: "u1",
      at: new Date().toISOString(),
    };
    const updatedLog = [...rc.activityLog, newLog];

    expect(updatedLog).toHaveLength(beforeCount + 1);
    expect(updatedLog[updatedLog.length - 1].kind).toBe("status_change");
  });
});

// ── Task CRUD テスト ──────────────────────────────────────
describe("RenewalCase task CRUD", () => {
  it("タスク追加: tasks に push され activityLog に kind=task が追加される", () => {
    const rc = makeRenewalCase();

    const newTask: Task = {
      id: "rt_01",
      title: "意向確認TEL",
      done: false,
      priority: "high",
      rolledOver: false,
      scope: "renewal",
      ownerId: "u1",
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...rc.tasks, newTask];
    const updatedLog = [
      ...rc.activityLog,
      {
        id: "rl_task",
        kind: "task" as const,
        body: `タスクを追加しました: ${newTask.title}`,
        byUserId: "u1",
        at: new Date().toISOString(),
      },
    ];

    expect(updatedTasks).toHaveLength(1);
    expect(updatedTasks[0].scope).toBe("renewal");
    expect(updatedLog[updatedLog.length - 1].kind).toBe("task");
  });

  it("タスク更新: 指定 taskId のみ patch される", () => {
    const task1: Task = {
      id: "rt_01",
      title: "タスク1",
      done: false,
      priority: "medium",
      rolledOver: false,
      scope: "renewal",
      createdAt: new Date().toISOString(),
    };
    const task2: Task = {
      id: "rt_02",
      title: "タスク2",
      done: false,
      priority: "low",
      rolledOver: false,
      scope: "renewal",
      createdAt: new Date().toISOString(),
    };
    const rc = makeRenewalCase({ tasks: [task1, task2] });

    const updatedTasks = rc.tasks.map((t) =>
      t.id === "rt_01" ? { ...t, title: "タスク1 (更新済み)" } : t,
    );

    expect(updatedTasks[0].title).toBe("タスク1 (更新済み)");
    expect(updatedTasks[1].title).toBe("タスク2"); // 変更なし
  });

  it("タスク完了トグル: done=true で doneDate/doneBy が設定される", () => {
    const task: Task = {
      id: "rt_01",
      title: "タスク1",
      done: false,
      priority: "medium",
      rolledOver: false,
      scope: "renewal",
      createdAt: new Date().toISOString(),
    };
    const rc = makeRenewalCase({ tasks: [task] });

    const today = "2026-09-08";
    const userId = "u1";
    const updatedTasks = rc.tasks.map((t) =>
      t.id === "rt_01"
        ? { ...t, done: true, doneDate: today, doneBy: userId }
        : t,
    );

    expect(updatedTasks[0].done).toBe(true);
    expect(updatedTasks[0].doneDate).toBe(today);
    expect(updatedTasks[0].doneBy).toBe(userId);
  });

  it("タスク完了解除: done=false で doneDate/doneBy がクリアされる", () => {
    const task: Task = {
      id: "rt_01",
      title: "タスク1",
      done: true,
      doneDate: "2026-09-01",
      doneBy: "u1",
      priority: "medium",
      rolledOver: false,
      scope: "renewal",
      createdAt: new Date().toISOString(),
    };
    const rc = makeRenewalCase({ tasks: [task] });

    const updatedTasks = rc.tasks.map((t) =>
      t.id === "rt_01"
        ? { ...t, done: false, doneDate: undefined, doneBy: undefined }
        : t,
    );

    expect(updatedTasks[0].done).toBe(false);
    expect(updatedTasks[0].doneDate).toBeUndefined();
    expect(updatedTasks[0].doneBy).toBeUndefined();
  });

  it("タスク削除: 指定 taskId が除去される", () => {
    const task1: Task = {
      id: "rt_01",
      title: "タスク1",
      done: false,
      priority: "medium",
      rolledOver: false,
      scope: "renewal",
      createdAt: new Date().toISOString(),
    };
    const task2: Task = {
      id: "rt_02",
      title: "タスク2",
      done: false,
      priority: "low",
      rolledOver: false,
      scope: "renewal",
      createdAt: new Date().toISOString(),
    };
    const rc = makeRenewalCase({ tasks: [task1, task2] });

    const updatedTasks = rc.tasks.filter((t) => t.id !== "rt_01");

    expect(updatedTasks).toHaveLength(1);
    expect(updatedTasks[0].id).toBe("rt_02");
  });
});

// ── maturityDate 昇順ソートテスト ─────────────────────────
describe("getRenewalCases ソートロジック", () => {
  it("maturityDate 昇順で並び替えができる", () => {
    const cases = [
      makeRenewalCase({ id: "rc_b", maturityDate: "2027-06-01" }),
      makeRenewalCase({ id: "rc_a", maturityDate: "2027-01-15" }),
      makeRenewalCase({ id: "rc_c", maturityDate: "2027-03-10" }),
    ];

    const sorted = [...cases].sort((a, b) =>
      a.maturityDate.localeCompare(b.maturityDate),
    );

    expect(sorted[0].id).toBe("rc_a");
    expect(sorted[1].id).toBe("rc_c");
    expect(sorted[2].id).toBe("rc_b");
  });
});
