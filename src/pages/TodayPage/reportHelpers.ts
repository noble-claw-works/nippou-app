import type { DailyReport } from "../../types/index";

export const canEditPlanned = (r: DailyReport | null): boolean =>
  !!r && (r.status === "planning" || r.status === "in_progress");

export const canEditActual = (r: DailyReport | null): boolean =>
  !!r && r.status === "in_progress";

// F1: 提出前であれば既存実績ブロックのD&D編集を許可
export const canDragActual = (r: DailyReport | null): boolean =>
  !!r && r.status !== "submitted" && r.status !== "confirmed";

export const isReadOnly = (r: DailyReport | null): boolean =>
  !!r && (r.status === "submitted" || r.status === "confirmed");
