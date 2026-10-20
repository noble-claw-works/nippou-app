export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
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

export const PAY_MODE_LABELS: Record<string, string> = {
  monthly: "月払",
  semi_annual: "半年払",
  annual: "年払",
  lump_sum: "一括払",
};

export const COVERAGE_TYPE_LABELS: Record<string, string> = {
  death: "死亡",
  living_benefit: "生前給付",
  medical_hospital: "入院",
  medical_surgery: "手術",
  cancer: "がん",
  critical_illness: "三大疾病",
  disability: "就業不能",
  nursing: "介護",
  savings: "貯蓄/年金",
  liability: "賠償",
  asset_damage: "物損",
  other: "その他",
};

export type Tab = "info" | "coverages" | "history" | "activities";
