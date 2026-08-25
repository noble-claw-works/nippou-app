// =====================================================
// taskMaster.test.ts — ADR-TASK-MASTER ユニットテスト
//
// T1: Task/TaskTemplate 型が正しく構築される
// T2: taskGenerator — 各トリガー関数の生成・冪等性
// T5: Seed データ (TASK_TEMPLATES) の整合性
// Store: addOppTask / toggleOppTaskDone / addHouseholdTask
// =====================================================
import { describe, it, expect, beforeEach } from "vitest";
import type {
  Opportunity,
  Task,
  TaskTemplate,
  Household,
  ProposalProduct,
} from "../types";
import { LIFE_CATEGORIES, NONLIFE_CATEGORIES } from "../types";
import {
  generateTasksOnHouseholdCreated,
  generateTasksOnOpportunityCreated,
  generateTasksOnProductAdded,
  generateTasksOnStageReached,
} from "../utils/taskGenerator";
import { TASK_TEMPLATES } from "../data/seed";
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

function mkProduct(id: string, category: string): ProposalProduct {
  return {
    id,
    productName: "テスト商品",
    productCategory: category,
    monthlyPremium: 10000,
    insurerId: "ins1",
    insuredPersonId: "p1",
  };
}

function activeTemplates(trigger: TaskTemplate["trigger"]) {
  return TASK_TEMPLATES.filter((t) => t.trigger === trigger && t.isActive);
}

// ═══════════════════════════════════════════════════════════════════════════════
// T1: 型整合性
// ═══════════════════════════════════════════════════════════════════════════════
describe("T1: Task 型の整合性", () => {
  it("LIFE_CATEGORIES は空でない配列である", () => {
    expect(LIFE_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("NONLIFE_CATEGORIES は空でない配列である", () => {
    expect(NONLIFE_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("LIFE_CATEGORIES と NONLIFE_CATEGORIES は重複しない", () => {
    const intersection = LIFE_CATEGORIES.filter((c) =>
      NONLIFE_CATEGORIES.includes(c as (typeof NONLIFE_CATEGORIES)[number]),
    );
    expect(intersection.length).toBe(0);
  });

  it("Task オブジェクトが正しく構築される", () => {
    const task: Task = {
      id: "t1",
      title: "告知書取得",
      done: false,
      priority: "high",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
      createdAt: _now,
    };
    expect(task.done).toBe(false);
    expect(task.priority).toBe("high");
    expect(task.scope).toBe("opportunity");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T5: Seed データ
// ═══════════════════════════════════════════════════════════════════════════════
describe("T5: TASK_TEMPLATES シードデータ", () => {
  it("12件のテンプレートが定義されている", () => {
    expect(TASK_TEMPLATES.length).toBe(12);
  });

  it("全テンプレートに id・title・trigger・scope・defaultPriority が存在する", () => {
    TASK_TEMPLATES.forEach((t) => {
      expect(t.id).toBeTruthy();
      expect(t.title.length).toBeGreaterThan(0);
      expect([
        "household_created",
        "opportunity_created",
        "product_added",
        "stage_reached",
      ]).toContain(t.trigger);
      expect(["household", "opportunity", "product"]).toContain(t.scope);
      expect(["high", "medium", "low"]).toContain(t.defaultPriority);
    });
  });

  it("household_created トリガーのテンプレートが存在する (2件)", () => {
    expect(activeTemplates("household_created").length).toBe(2);
  });

  it("opportunity_created トリガーのテンプレートが存在する (2件)", () => {
    expect(activeTemplates("opportunity_created").length).toBe(2);
  });

  it("product_added トリガーのテンプレートが存在する (4件)", () => {
    expect(activeTemplates("product_added").length).toBe(4);
  });

  it("stage_reached トリガーのテンプレートが存在する (4件)", () => {
    expect(activeTemplates("stage_reached").length).toBe(4);
  });

  it("product_added テンプレートは productCategories が null か配列", () => {
    TASK_TEMPLATES.filter((t) => t.trigger === "product_added").forEach((t) => {
      expect(
        t.productCategories === null || Array.isArray(t.productCategories),
      ).toBe(true);
    });
  });

  it("stage_reached テンプレートは triggerStage が存在する", () => {
    TASK_TEMPLATES.filter((t) => t.trigger === "stage_reached").forEach((t) => {
      expect(t.triggerStage).toBeTruthy();
    });
  });

  it("全テンプレートの id がユニーク", () => {
    const ids = TASK_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T2: taskGenerator
// ═══════════════════════════════════════════════════════════════════════════════
describe("T2: generateTasksOnHouseholdCreated", () => {
  it("有効テンプレートがある場合タスクを生成する", () => {
    const household = mkHousehold("c1");
    const result = generateTasksOnHouseholdCreated(
      household,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("生成タスクに sourceMasterId が付与される", () => {
    const household = mkHousehold("c2");
    const result = generateTasksOnHouseholdCreated(
      household,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    result.forEach((t) => {
      expect(t.sourceMasterId).toBeTruthy();
    });
  });

  it("冪等チェック: 既存タスクと同じ sourceMasterId があればスキップ", () => {
    const tmpl = TASK_TEMPLATES.find((t) => t.trigger === "household_created")!;
    const existingTask: Task = {
      id: "t_existing",
      title: "既存",
      done: false,
      priority: "medium",
      scope: "household",
      rolledOver: false,
      householdId: "c3",
      sourceMasterId: tmpl.id,
      createdAt: _now,
    };
    const household: Household = {
      ...mkHousehold("c3"),
      tasks: [existingTask],
    };
    const result = generateTasksOnHouseholdCreated(
      household,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    // 既存タスクの sourceMasterId は生成されない
    const newIds = result.map((t) => t.sourceMasterId);
    expect(newIds).not.toContain(tmpl.id);
  });

  it("householdId が付与される", () => {
    const household = mkHousehold("c4");
    const result = generateTasksOnHouseholdCreated(
      household,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    result.forEach((t) => {
      expect(t.householdId).toBe("c4");
    });
  });
});

describe("T2: generateTasksOnOpportunityCreated", () => {
  it("有効テンプレートがある場合タスクを生成する", () => {
    const opp = mkOpp("o1");
    const result = generateTasksOnOpportunityCreated(
      opp,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("生成タスクの scope は opportunity", () => {
    const opp = mkOpp("o2");
    const result = generateTasksOnOpportunityCreated(
      opp,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    result.forEach((t) => {
      expect(t.scope).toBe("opportunity");
    });
  });

  it("冪等チェック: 既存タスクがある sourceMasterId はスキップ", () => {
    const tmpl = TASK_TEMPLATES.find(
      (t) => t.trigger === "opportunity_created",
    )!;
    const existingTask: Task = {
      id: "t_opp_existing",
      title: "既存案件タスク",
      done: false,
      priority: "medium",
      scope: "opportunity",
      rolledOver: false,
      householdId: "c1",
      sourceMasterId: tmpl.id,
      createdAt: _now,
    };
    const opp: Opportunity = { ...mkOpp("o3"), tasks: [existingTask] };
    const result = generateTasksOnOpportunityCreated(
      opp,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    const newIds = result.map((t) => t.sourceMasterId);
    expect(newIds).not.toContain(tmpl.id);
  });
});

describe("T2: generateTasksOnProductAdded", () => {
  it("生命保険カテゴリで life 系テンプレートがヒットする", () => {
    const opp = mkOpp("o4");
    const product = mkProduct("prod1", LIFE_CATEGORIES[0]);
    const result = generateTasksOnProductAdded(
      opp,
      product,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("損保カテゴリで nonlife 系テンプレートがヒットする", () => {
    const opp = mkOpp("o5");
    const product = mkProduct("prod2", NONLIFE_CATEGORIES[0]);
    const result = generateTasksOnProductAdded(
      opp,
      product,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("scope は product", () => {
    const opp = mkOpp("o6");
    const product = mkProduct("prod3", LIFE_CATEGORIES[0]);
    const result = generateTasksOnProductAdded(
      opp,
      product,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    result.forEach((t) => {
      expect(t.scope).toBe("product");
    });
  });

  it("productId が付与される", () => {
    const opp = mkOpp("o7");
    const product = mkProduct("prod4", LIFE_CATEGORIES[0]);
    const result = generateTasksOnProductAdded(
      opp,
      product,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    result.forEach((t) => {
      expect(t.productId).toBe("prod4");
    });
  });

  it("冪等チェック: 同一 (sourceMasterId, productId) は重複生成しない", () => {
    const tmpl = TASK_TEMPLATES.find((t) => t.trigger === "product_added")!;
    const product = mkProduct("prod5", LIFE_CATEGORIES[0]);
    const existingTask: Task = {
      id: "t_prod_existing",
      title: "既存商品タスク",
      done: false,
      priority: "medium",
      scope: "product",
      rolledOver: false,
      householdId: "c1",
      sourceMasterId: tmpl.id,
      productId: "prod5",
      createdAt: _now,
    };
    const opp: Opportunity = { ...mkOpp("o8"), tasks: [existingTask] };
    const result = generateTasksOnProductAdded(
      opp,
      product,
      TASK_TEMPLATES,
      "2026-08-25",
    );
    const matchingNew = result.filter(
      (t) => t.sourceMasterId === tmpl.id && t.productId === "prod5",
    );
    expect(matchingNew.length).toBe(0);
  });
});

describe("T2: generateTasksOnStageReached", () => {
  it("proposal ステージでタスクを生成する", () => {
    const opp = mkOpp("o9", "analysis");
    const result = generateTasksOnStageReached(
      opp,
      "proposal",
      TASK_TEMPLATES,
      "2026-08-25",
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("issued ステージでタスクを生成する", () => {
    const opp = mkOpp("o10", "closing");
    const result = generateTasksOnStageReached(
      opp,
      "issued",
      TASK_TEMPLATES,
      "2026-08-25",
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("sourceMasterId が付与される", () => {
    const opp = mkOpp("o11");
    const result = generateTasksOnStageReached(
      opp,
      "proposal",
      TASK_TEMPLATES,
      "2026-08-25",
    );
    result.forEach((t) => {
      expect(t.sourceMasterId).toBeTruthy();
    });
  });

  it("prospect ステージではタスクを生成しない (テンプレートなし)", () => {
    const opp = mkOpp("o12");
    const result = generateTasksOnStageReached(
      opp,
      "prospect",
      TASK_TEMPLATES,
      "2026-08-25",
    );
    // prospect 用テンプレートはシードに含まれない
    const prospectTemplates = TASK_TEMPLATES.filter(
      (t) => t.trigger === "stage_reached" && t.triggerStage === "prospect",
    );
    if (prospectTemplates.length === 0) {
      expect(result.length).toBe(0);
    }
  });
});

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
