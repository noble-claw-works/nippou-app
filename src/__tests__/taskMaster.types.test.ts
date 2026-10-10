// =====================================================
// taskMaster.types.test.ts — ADR-TASK-MASTER ユニットテスト
// T1: Task/TaskTemplate 型が正しく構築される
// T5: Seed データ (TASK_TEMPLATES) の整合性
// =====================================================
import { describe, it, expect } from "vitest";
import type { Task, TaskTemplate } from "../types";
import { LIFE_CATEGORIES, NONLIFE_CATEGORIES } from "../types";
import { TASK_TEMPLATES } from "../data/seed";

// ─── helpers ─────────────────────────────────────────────────────────────────
const _now = new Date().toISOString();

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
