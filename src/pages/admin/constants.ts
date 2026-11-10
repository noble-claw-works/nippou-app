import type {
  TaskTriggerType,
  TaskScope,
  TaskPriority,
  OpportunityStage,
  TaskTemplate,
} from "../../types";

export const TRIGGER_LABELS: Record<TaskTriggerType, string> = {
  household_created: "世帯作成時",
  opportunity_created: "案件作成時",
  product_added: "商品追加時",
  stage_reached: "ステージ到達時",
};

export const SCOPE_LABELS: Record<TaskScope, string> = {
  household: "世帯",
  opportunity: "案件",
  product: "商品",
  renewal: "更新案件",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = [
  { value: "approach", label: "アプローチ" },
  { value: "fact_finding", label: "ヒアリング" },
  { value: "needs_analysis", label: "ニーズ分析" },
  { value: "proposal", label: "提案" },
  { value: "negotiation", label: "交渉" },
  { value: "application", label: "申込" },
  { value: "underwriting", label: "引受査定" },
  { value: "issued", label: "契約成立" },
  { value: "lost", label: "失注" },
];

export const BLANK_TMPL: Omit<TaskTemplate, "id" | "createdAt" | "updatedAt"> =
  {
    title: "",
    scope: "opportunity",
    trigger: "opportunity_created",
    productCategories: null,
    triggerStage: undefined,
    defaultDueOffsetDays: undefined,
    defaultPriority: "medium",
    defaultMemo: undefined,
    order: 99,
    isActive: true,
  };

export type ProductCategorySet = "all" | "life" | "nonlife" | "none";
