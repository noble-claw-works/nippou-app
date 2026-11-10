// =====================================================
// renewalImport/parsers.ts — CSVパース系ヘルパー
// =====================================================
import type { RenewalMethod, RenewalProductType } from "../../types";

/** CSVの種目文字列 → RenewalProductType に変換（前方一致・大文字小文字無視） */
export function parseProductType(raw: string): RenewalProductType {
  const map: Record<string, RenewalProductType> = {
    自動車: "auto",
    火災: "fire",
    新種: "shinshu",
    超保険: "cho_hoken",
    超ビジ: "cho_biz",
    貨物: "cargo",
    動産: "movable",
    賠償: "liability",
  };
  for (const [key, val] of Object.entries(map)) {
    if (raw.includes(key)) return val;
  }
  return "other";
}

/** CSVの手続き手段文字列 → RenewalMethod に変換 */
export function parseMethod(raw: string): RenewalMethod {
  if (raw.includes("らくらく")) return "rakuraku_seat";
  if (raw.includes("電話")) return "phone";
  if (raw.includes("来店")) return "visit";
  if (raw.includes("郵送")) return "mail";
  if (raw.includes("更新落ち") || raw.includes("更新落")) return "renewal_lost";
  return "undecided";
}

/** CSVの前年保険料文字列 → number に変換 */
export function parsePremium(raw: string): number | undefined {
  const cleaned = raw.replace(/[¥,円\s]/g, "");
  const n = Number(cleaned);
  return isNaN(n) || cleaned === "" ? undefined : n;
}

/** UID 生成（簡易 nanoid 相当） */
export function genId(): string {
  return `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
