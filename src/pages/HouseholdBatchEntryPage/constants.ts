import type { ProductCategory } from "../../types";

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  life: "生命保険",
  medical: "医療保険",
  cancer: "がん保険",
  income: "就業不能保険",
  nursing: "介護保険",
  savings: "学資・貯蓄",
  auto: "自動車保険",
  fire: "火災保険",
  liability: "賠償責任保険",
  other: "その他",
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "life",
  "medical",
  "cancer",
  "income",
  "nursing",
  "savings",
  "auto",
  "fire",
  "liability",
  "other",
];
