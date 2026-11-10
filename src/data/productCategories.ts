// =====================================================
// productCategories.ts — 種目マスタ初期データ
// 既存 PRODUCT_CATEGORY_LABELS の値をそのまま移植
// =====================================================
import type { ProductCategoryMaster } from "../types/insurance";

export const INITIAL_PRODUCT_CATEGORIES: ProductCategoryMaster[] = [
  {
    id: "pc_life",
    name: "生命保険",
    categoryKey: "life",
    isActive: true,
    order: 1,
  },
  {
    id: "pc_medical",
    name: "医療保険",
    categoryKey: "medical",
    isActive: true,
    order: 2,
  },
  {
    id: "pc_cancer",
    name: "がん保険",
    categoryKey: "cancer",
    isActive: true,
    order: 3,
  },
  {
    id: "pc_income",
    name: "就業不能保険",
    categoryKey: "income",
    isActive: true,
    order: 4,
  },
  {
    id: "pc_nursing",
    name: "介護保険",
    categoryKey: "nursing",
    isActive: true,
    order: 5,
  },
  {
    id: "pc_savings",
    name: "学資・貯蓄",
    categoryKey: "savings",
    isActive: true,
    order: 6,
  },
  {
    id: "pc_auto",
    name: "自動車保険",
    categoryKey: "auto",
    isActive: true,
    order: 7,
  },
  {
    id: "pc_fire",
    name: "火災保険",
    categoryKey: "fire",
    isActive: true,
    order: 8,
  },
  {
    id: "pc_liability",
    name: "賠償責任保険",
    categoryKey: "liability",
    isActive: true,
    order: 9,
  },
  {
    id: "pc_other",
    name: "その他",
    categoryKey: "other",
    isActive: true,
    order: 10,
  },
];
