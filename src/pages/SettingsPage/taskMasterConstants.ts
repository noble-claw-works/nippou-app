// =====================================================
// taskMasterConstants.ts — TaskMasterTab/Form 共有定数・型
// Fast Refresh 対応のためコンポーネントから切り出し (工程B-2)
// =====================================================
import type { TaskTemplate, TaskTimingType, TaskBaseDateType } from "../../types";

export const TIMING_LABELS: Record<TaskTimingType, string> = {
  on_opportunity_created: "商談追加時（即時）",
  offset_from_base_date: "基準日 ±N 日",
};

export const BASE_DATE_LABELS: Record<TaskBaseDateType, string> = {
  first_consult_date: "初回相談日",
  renewal_due_date: "更新予定日",
};

export type DraftTemplate = Omit<TaskTemplate, "id" | "createdAt" | "updatedAt">;

export const BLANK_TASK_MASTER: DraftTemplate = {
  title: "",
  scope: "opportunity",
  trigger: "opportunity_created",
  productCategories: null,
  defaultPriority: "medium",
  order: 99,
  isActive: true,
  timingType: "on_opportunity_created",
  baseDateType: undefined,
  offsetDays: undefined,
};
