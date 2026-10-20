// =====================================================
// renewalContacts.ts — コンタクト履歴ユーティリティ（純関数）
//   実入力式コンタクト履歴(RenewalContactRecord[])から
//   ファーストコンタクト日(FC日)を導出する。
//   FC日 = result==="talked"(話せた)の最も古い date。
// =====================================================
import type { RenewalContactRecord } from "../types/renewal";

/**
 * コンタクト履歴を date 昇順にソートして返す（純関数・非破壊）。
 * date が空/等しい場合は元の相対順を保つ（安定ソート）。
 */
export function sortContactsByDate(
  contacts: RenewalContactRecord[] | undefined,
): RenewalContactRecord[] {
  if (!contacts || contacts.length === 0) return [];
  return contacts
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const d = (a.c.date ?? "").localeCompare(b.c.date ?? "");
      return d !== 0 ? d : a.i - b.i;
    })
    .map(({ c }) => c);
}

/**
 * ファーストコンタクト日を導出する（純関数）。
 * - contacts のうち result==="talked"(話せた) の最も古い date を返す。
 * - 該当が無ければ fallback(= survey.firstContactDate) を返す。
 * - fallback も無ければ undefined。
 */
export function deriveFirstContactDate(
  contacts: RenewalContactRecord[] | undefined,
  fallback?: string,
): string | undefined {
  const talked = (contacts ?? []).filter(
    (c) => c.result === "talked" && !!c.date,
  );
  if (talked.length === 0) return fallback || undefined;
  return talked.reduce((min, c) => (c.date < min ? c.date : min), talked[0].date);
}
