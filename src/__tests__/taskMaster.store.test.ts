// =====================================================
// taskMaster.store.test.ts — ADR-TASK-MASTER ユニットテスト
// Store: addOppTask / toggleOppTaskDone / removeOppTask / addHouseholdTask
// Store: TaskTemplate CRUD
// =====================================================
import { describe, it, expect, beforeEach } from "vitest";
import type { Opportunity, Household } from "../types";
import { useAppStore } from "../store";

// ─── helpers ─────────────────────────────────────────────────────────────────
const _now = new Date().toISOString();

function mkOpp(
  id: string,
  stage: Opportunity["stage"] = "prospect",
): Opportunity {
  return {
    id,
    householdId: "c1",
    ownerId: "u1",
    title: "テスト案件",
    stage,
    status: "active",
    productCategories: [],
    proposalProducts: [],
    targetPersonIds: [],
    needsAnalysisDone: false,
    illustrationProvided: false,
    stageHistory: [],
    tags: [],
    memo: "",
    tasks: [],
    createdAt: _now,
    updatedAt: _now,
  };
}

function mkHousehold(id: string): Household {
  return {
    id,
    name: "テスト世帯",
    type: "individual",
    status: "active",
    primaryUserId: "u1",
    tags: [],
    tasks: [],
    createdAt: _now,
    updatedAt: _now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store: addOppTask / toggleOppTaskDone / removeOppTask / addHouseholdTask
// ═══════════════════════════════════════════════════════════════════════════════
describe("Store: 案件タスク CRUD", () => {
  let oppId: string;

  beforeEach(() => {
    useAppStore.setState((state) => {
      const opp = mkOpp("opp-task-test");
      oppId = opp.id;
      return {
        opportunities: [...state.opportunities, opp],
        taskTemplates: [],
      };
    });
  });

  it("addOppTask: タスクが opportunities に追加される", () => {
    useAppStore.getState().addOppTask(oppId, {
      title: "証券コピー取得",
      done: false,
      priority: "high",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const opp = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId);
    expect(opp?.tasks?.length).toBe(1);
    expect(opp?.tasks?.[0].title).toBe("証券コピー取得");
  });

  it("addOppTask: 生成タスクに id・createdAt が付与される", () => {
    useAppStore.getState().addOppTask(oppId, {
      title: "テストタスク",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const opp = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId);
    const task = opp?.tasks?.[0];
    expect(task?.id).toBeTruthy();
    expect(task?.createdAt).toBeTruthy();
  });

  it("toggleOppTaskDone: done が true に変わり doneDate が設定される", () => {
    useAppStore.getState().addOppTask(oppId, {
      title: "完了テスト",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const taskId = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)!.tasks![0].id;
    useAppStore.getState().toggleOppTaskDone(oppId, taskId, true);
    const task = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)
      ?.tasks?.find((t) => t.id === taskId);
    expect(task?.done).toBe(true);
    expect(task?.doneDate).toBeTruthy();
  });

  it("toggleOppTaskDone: done が false に戻ると doneDate がクリアされる", () => {
    useAppStore.getState().addOppTask(oppId, {
      title: "未完了に戻すテスト",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const taskId = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)!.tasks![0].id;
    useAppStore.getState().toggleOppTaskDone(oppId, taskId, true);
    useAppStore.getState().toggleOppTaskDone(oppId, taskId, false);
    const task = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)
      ?.tasks?.find((t) => t.id === taskId);
    expect(task?.done).toBe(false);
    expect(task?.doneDate).toBeUndefined();
  });

  it("toggleOppTaskDone: done=true の時 doneBy に currentUserId が入る", () => {
    // Arrange
    useAppStore.setState({ currentUserId: "u1" });
    useAppStore.getState().addOppTask(oppId, {
      title: "doneByテスト",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const taskId = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)!.tasks![0].id;

    // Act
    useAppStore.getState().toggleOppTaskDone(oppId, taskId, true);

    // Assert
    const task = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)
      ?.tasks?.find((t) => t.id === taskId);
    expect(task?.done).toBe(true);
    expect(task?.doneBy).toBe("u1");
  });

  it("toggleOppTaskDone: done=false の時 doneBy が消える", () => {
    // Arrange
    useAppStore.setState({ currentUserId: "u1" });
    useAppStore.getState().addOppTask(oppId, {
      title: "doneByクリアテスト",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const taskId = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)!.tasks![0].id;
    // First mark done
    useAppStore.getState().toggleOppTaskDone(oppId, taskId, true);
    expect(
      useAppStore
        .getState()
        .opportunities.find((o) => o.id === oppId)
        ?.tasks?.find((t) => t.id === taskId)?.doneBy,
    ).toBe("u1");

    // Act: mark undone
    useAppStore.getState().toggleOppTaskDone(oppId, taskId, false);

    // Assert
    const task = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)
      ?.tasks?.find((t) => t.id === taskId);
    expect(task?.done).toBe(false);
    expect(task?.doneBy).toBeUndefined();
  });

  it("removeOppTask: タスクが削除される", () => {
    useAppStore.getState().addOppTask(oppId, {
      title: "削除タスク",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const taskId = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)!.tasks![0].id;
    useAppStore.getState().removeOppTask(oppId, taskId);
    const opp = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId);
    expect(opp?.tasks?.find((t) => t.id === taskId)).toBeUndefined();
  });

  it("updateOppTask: タスク内容が更新される", () => {
    useAppStore.getState().addOppTask(oppId, {
      title: "更新前",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
    });
    const taskId = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)!.tasks![0].id;
    useAppStore
      .getState()
      .updateOppTask(oppId, taskId, { title: "更新後", priority: "high" });
    const task = useAppStore
      .getState()
      .opportunities.find((o) => o.id === oppId)
      ?.tasks?.find((t) => t.id === taskId);
    expect(task?.title).toBe("更新後");
    expect(task?.priority).toBe("high");
  });
});

describe("Store: 世帯タスク CRUD", () => {
  let householdId: string;

  beforeEach(() => {
    useAppStore.setState((state) => {
      const hh = mkHousehold("hh-task-test");
      householdId = hh.id;
      return {
        customers: [...state.customers, hh],
        taskTemplates: [],
      };
    });
  });

  it("addHouseholdTask: タスクが customers に追加される", () => {
    useAppStore.getState().addHouseholdTask(householdId, {
      title: "世帯タスクテスト",
      done: false,
      priority: "medium",
      scope: "household",
      rolledOver: false,
      householdId,
    });
    const hh = useAppStore
      .getState()
      .customers.find((c) => c.id === householdId) as Household;
    expect(hh?.tasks?.length).toBe(1);
    expect(hh?.tasks?.[0].title).toBe("世帯タスクテスト");
  });

  it("toggleHouseholdTaskDone: done が true に変わる", () => {
    useAppStore.getState().addHouseholdTask(householdId, {
      title: "世帯完了テスト",
      done: false,
      priority: "low",
      scope: "household",
      rolledOver: false,
      householdId,
    });
    const taskId = (
      useAppStore
        .getState()
        .customers.find((c) => c.id === householdId) as Household
    ).tasks![0].id;
    useAppStore.getState().toggleHouseholdTaskDone(householdId, taskId, true);
    const hh = useAppStore
      .getState()
      .customers.find((c) => c.id === householdId) as Household;
    expect(hh?.tasks?.find((t) => t.id === taskId)?.done).toBe(true);
  });

  it("removeHouseholdTask: タスクが削除される", () => {
    useAppStore.getState().addHouseholdTask(householdId, {
      title: "削除対象",
      done: false,
      priority: "low",
      scope: "household",
      rolledOver: false,
      householdId,
    });
    const taskId = (
      useAppStore
        .getState()
        .customers.find((c) => c.id === householdId) as Household
    ).tasks![0].id;
    useAppStore.getState().removeHouseholdTask(householdId, taskId);
    const hh = useAppStore
      .getState()
      .customers.find((c) => c.id === householdId) as Household;
    expect(hh?.tasks?.find((t) => t.id === taskId)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Store: TaskTemplate CRUD
// ═══════════════════════════════════════════════════════════════════════════════
describe("Store: TaskTemplate CRUD", () => {
  beforeEach(() => {
    useAppStore.setState({ taskTemplates: [] });
  });

  it("addTaskTemplate: テンプレートが追加される", () => {
    useAppStore.getState().addTaskTemplate({
      title: "テスト追加テンプレ",
      scope: "opportunity",
      trigger: "opportunity_created",
      productCategories: null,
      defaultPriority: "medium",
      order: 1,
      isActive: true,
    });
    const templates = useAppStore.getState().taskTemplates;
    expect(templates.length).toBe(1);
    expect(templates[0].title).toBe("テスト追加テンプレ");
    expect(templates[0].id).toBeTruthy();
  });

  it("updateTaskTemplate: テンプレートが更新される", () => {
    useAppStore.getState().addTaskTemplate({
      title: "更新前テンプレ",
      scope: "opportunity",
      trigger: "opportunity_created",
      productCategories: null,
      defaultPriority: "low",
      order: 1,
      isActive: true,
    });
    const id = useAppStore.getState().taskTemplates[0].id;
    useAppStore
      .getState()
      .updateTaskTemplate(id, { title: "更新後テンプレ", isActive: false });
    const tmpl = useAppStore.getState().taskTemplates.find((t) => t.id === id);
    expect(tmpl?.title).toBe("更新後テンプレ");
    expect(tmpl?.isActive).toBe(false);
  });

  it("removeTaskTemplate: テンプレートが削除される", () => {
    useAppStore.getState().addTaskTemplate({
      title: "削除対象テンプレ",
      scope: "opportunity",
      trigger: "opportunity_created",
      productCategories: null,
      defaultPriority: "medium",
      order: 1,
      isActive: true,
    });
    const id = useAppStore.getState().taskTemplates[0].id;
    useAppStore.getState().removeTaskTemplate(id);
    expect(
      useAppStore.getState().taskTemplates.find((t) => t.id === id),
    ).toBeUndefined();
  });
});
