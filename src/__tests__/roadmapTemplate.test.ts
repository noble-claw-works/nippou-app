// =====================================================
// roadmapTemplate.test.ts — ロードマップ項目バリデータ（T5-07 §8.4）
// =====================================================
import { describe, it, expect } from "vitest";
import type { RenewalRoadmapItemDef } from "../types";
import {
  MAX_ROADMAP_ITEMS,
  validateRoadmapItems,
  sortRoadmapItems,
  activeRoadmapItems,
} from "../utils/roadmapTemplate";

function item(
  id: string,
  order: number,
  over: Partial<RenewalRoadmapItemDef> = {},
): RenewalRoadmapItemDef {
  return { id, order, label: `項目${order}`, active: true, ...over };
}

describe("validateRoadmapItems", () => {
  it("最大4件は OK", () => {
    const items = [item("a", 1), item("b", 2), item("c", 3), item("d", 4)];
    const v = validateRoadmapItems(items);
    expect(v.ok).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("5件は最大超過でエラー", () => {
    const items = [
      item("a", 1),
      item("b", 2),
      item("c", 3),
      item("d", 4),
      item("e", 5),
    ];
    const v = validateRoadmapItems(items);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes(String(MAX_ROADMAP_ITEMS)))).toBe(
      true,
    );
  });

  it("有効項目の空ラベルはエラー", () => {
    const items = [item("a", 1, { label: "  " })];
    const v = validateRoadmapItems(items);
    expect(v.ok).toBe(false);
  });

  it("無効項目の空ラベルは許容", () => {
    const items = [item("a", 1, { label: "", active: false })];
    const v = validateRoadmapItems(items);
    expect(v.ok).toBe(true);
  });

  it("id 重複はエラー", () => {
    const items = [item("a", 1), item("a", 2)];
    const v = validateRoadmapItems(items);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("order 重複はエラー", () => {
    const items = [item("a", 1), item("b", 1)];
    const v = validateRoadmapItems(items);
    expect(v.ok).toBe(false);
  });
});

describe("sortRoadmapItems / activeRoadmapItems", () => {
  it("order 昇順でソート（非破壊）", () => {
    const items = [item("b", 3), item("a", 1), item("c", 2)];
    const sorted = sortRoadmapItems(items);
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(items[0].id).toBe("b"); // 元配列は不変
  });

  it("activeRoadmapItems は active のみを order 順で返す", () => {
    const items = [
      item("a", 1),
      item("b", 2, { active: false }),
      item("c", 3),
    ];
    const act = activeRoadmapItems(items);
    expect(act.map((i) => i.id)).toEqual(["a", "c"]);
  });
});
