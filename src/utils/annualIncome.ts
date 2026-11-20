// 世帯主年収(万円)の入力文字列 → 数値 (#305 B6)
export function parseAnnualIncome(raw: string): {
  value?: number;
  error?: string;
} {
  const t = raw.trim();
  if (!t) return {};
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0)
    return { error: "年収は0以上の数値で入力してください" };
  return { value: n };
}
