// =====================================================
// taskMaster.generator.test.ts — ADR-TASK-MASTER ユニットテスト
// T2: taskGenerator — 各トリガー関数の生成・冪等性
// =====================================================
import { describe, it, expect } from "vitest";
import type { Opportunity, Task, Household, ProposalProduct } from "../types";
import { LIFE_CATEGORIES, NONLIFE_CATEGORIES } from "../types";
import {
  generateTasksOnHouseholdCreated,
  generateTasksOnOpportunityCreated,
  generateTasksOnProductAdded,
  generateTasksOnStageReached,
} from "../utils/taskGenerator";
import { TASK_TEMPLATES } from "../data/seed";

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
