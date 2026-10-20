import type { ProductCategory } from "../../types";
import type { StageTabKey7 } from "../../utils/opportunityStage";

export type StageTabKey = StageTabKey7;

export interface StageTab {
  key: StageTabKey;
  label: string;
}

export const STAGE_TABS: StageTab[] = [
  { key: "first_consult", label: "初回相談" },
  { key: "lifeplan", label: "LP提案" },
  { key: "proposed", label: "提案" },
  { key: "contract_pending", label: "契約予定" },
  { key: "contract", label: "契約" },
  { key: "issued", label: "成立" },
  { key: "lost", label: "失注" },
];

export type ViewMode = "household" | "product";

export type SortKey =
  "expectedCloseDate" | "totalMonthlyPremium" | "updatedAt" | "contractor";

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
