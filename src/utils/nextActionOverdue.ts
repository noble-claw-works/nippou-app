import { format } from "date-fns";

/** 次アクション日が今日より前なら期限超過 (#305 A5)。未設定/不正は false */
export function isNextActionOverdue(
  date: string | undefined | null,
  now: Date = new Date(),
): boolean {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return false;
  return date.slice(0, 10) < format(now, "yyyy-MM-dd");
}

export const OVERDUE_CLASS = "text-red-600 font-medium";
