// =====================================================
// renewalDays.ts — 更新案件の日数算出 util（§2.2 / PC-2）
// 全て純関数。引数は yyyy-MM-dd もしくは undefined。基準日は注入可能。
// =====================================================
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

/** yyyy-MM-dd を安全に Date 化（不正/空は null） */
function toDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

/**
 * 本日基点の残り日数 = maturityDate − today（満期まで。負値=経過）。
 * いずれか欠損・不正は null。
 */
export function daysFromToday(
  maturityDate: string | undefined,
  today: string,
): number | null {
  const m = toDate(maturityDate);
  const t = toDate(today);
  if (!m || !t) return null;
  return differenceInCalendarDays(m, t);
}

/**
 * FC日基点の日数 = maturityDate − firstContactDate（満期まで）。
 * いずれか欠損・不正は null。
 */
export function daysFromFirstContact(
  maturityDate: string | undefined,
  firstContactDate: string | undefined,
): number | null {
  const m = toDate(maturityDate);
  const f = toDate(firstContactDate);
  if (!m || !f) return null;
  return differenceInCalendarDays(m, f);
}

/**
 * 手続き時点での(満期日からの)日数 = procedureDate − maturityDate。
 * 満期前なら負値。いずれか欠損・不正は null（表示時 "—"）。
 */
export function daysAtProcedure(
  procedureDate: string | undefined,
  maturityDate: string | undefined,
): number | null {
  const p = toDate(procedureDate);
  const m = toDate(maturityDate);
  if (!p || !m) return null;
  return differenceInCalendarDays(p, m);
}

/** 表示整形: null → "—", 数値 → "N日"（符号付き。負値は "-N日"） */
export function formatDayCount(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n}日`;
}
