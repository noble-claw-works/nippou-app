// =====================================================
// masters.test.ts — 保険会社マスタ / 種目マスタ 最小テスト
// =====================================================
import { describe, it, expect } from "vitest";
import { INITIAL_INSURANCE_COMPANIES } from "../data/insuranceCompanies";
import { INITIAL_PRODUCT_CATEGORIES } from "../data/productCategories";
import type { InsuranceCompany, ProductCategoryMaster } from "../types";

// ── InsuranceCompany ─────────────────────────────────
describe("INITIAL_INSURANCE_COMPANIES", () => {
  it("1件以上の初期データが存在する", () => {
    expect(INITIAL_INSURANCE_COMPANIES.length).toBeGreaterThan(0);
  });

  it("全件 isActive:true かつ order が 1 から連番", () => {
    INITIAL_INSURANCE_COMPANIES.forEach((c: InsuranceCompany, idx: number) => {
      expect(c.isActive).toBe(true);
      expect(c.order).toBe(idx + 1);
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
    });
  });

  it("id が一意", () => {
    const ids = INITIAL_INSURANCE_COMPANIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── ProductCategoryMaster ────────────────────────────
describe("INITIAL_PRODUCT_CATEGORIES", () => {
  it("1件以上の初期データが存在する", () => {
    expect(INITIAL_PRODUCT_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("全件 isActive:true かつ categoryKey が空でない", () => {
    INITIAL_PRODUCT_CATEGORIES.forEach((c: ProductCategoryMaster) => {
      expect(c.isActive).toBe(true);
      expect(c.categoryKey).toBeTruthy();
      expect(c.name).toBeTruthy();
    });
  });

  it("id が一意", () => {
    const ids = INITIAL_PRODUCT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("既存の ProductCategory キーを含む（後方互換）", () => {
    const keys = INITIAL_PRODUCT_CATEGORIES.map((c) => c.categoryKey);
    // 既存 PRODUCT_CATEGORY_LABELS の主要キーが移植されていること
    expect(keys).toContain("life");
    expect(keys).toContain("medical");
    expect(keys).toContain("cancer");
    expect(keys).toContain("auto");
    expect(keys).toContain("fire");
  });
});
