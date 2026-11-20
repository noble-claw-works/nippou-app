// =====================================================
// insurerMatch.ts — 保険会社マスタの名寄せ・読み込み時変換（B3）
// すべて純関数・冪等（2 回適用しても結果が同じ）。
// =====================================================
import type { InsuranceCompany, InsurerKind } from "../types/insurance";
import type { Opportunity } from "../types";

export const INSURER_KIND_LABELS: Record<InsurerKind, string> = {
  life: "生保",
  non_life: "損保",
};

/** 比較用に正規化（全半角統一・空白除去・小文字化） */
export function normalizeInsurerName(s: string): string {
  return (s ?? "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

/** カンマ（全半角）/読点/改行区切りの別名入力を配列化（空・重複除去） */
export function parseAliases(input: string): string[] {
  const out: string[] = [];
  for (const t of input.split(/[,，、\n]/)) {
    const v = t.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/** 名前/別名の完全一致（正規化後）でマスタ会社を探す。無ければ undefined */
export function findInsurerByName(
  companies: InsuranceCompany[],
  name: string | undefined | null,
): InsuranceCompany | undefined {
  const key = normalizeInsurerName(name ?? "");
  if (!key) return undefined;
  const sorted = [...companies].sort((a, b) => a.order - b.order);
  return sorted.find(
    (c) =>
      normalizeInsurerName(c.name) === key ||
      (c.aliases ?? []).some((a) => normalizeInsurerName(a) === key),
  );
}

/**
 * 保存済みマスタに初期データを合流させる。
 * - 初期データにあって保存側に無い id は追加
 * - 保存側で kind / aliases が未設定のものだけ初期データから補完（編集済みの値は上書きしない）
 */
export function mergeInsuranceCompanies(
  stored: InsuranceCompany[],
  initial: InsuranceCompany[],
): InsuranceCompany[] {
  const initById = new Map(initial.map((c) => [c.id, c]));
  const merged = stored.map((c) => {
    const init = initById.get(c.id);
    if (!init) return c;
    const kind = c.kind ?? init.kind;
    const aliases = c.aliases ?? init.aliases;
    if (kind === c.kind && aliases === c.aliases) return c;
    return { ...c, kind, aliases };
  });
  const have = new Set(stored.map((c) => c.id));
  const maxOrder = stored.reduce((m, c) => Math.max(m, c.order), 0);
  // 同名/別名が既に在る（テスターが手で追加済み等）なら重複追加しない（冪等）
  const added = initial
    .filter((c) => !have.has(c.id) && !findInsurerByName(stored, c.name))
    .map((c, i) => ({ ...c, order: maxOrder + i + 1 }));
  return [...merged, ...added];
}

/** 提案商品の insurerId を補完する。既に insurerId があればそのまま */
export function backfillOpportunityInsurerIds(
  opps: Opportunity[],
  companies: InsuranceCompany[],
): Opportunity[] {
  let changed = false;
  const out = opps.map((o) => {
    if (!o.proposalProducts?.some((p) => !p.insurerId)) return o;
    const products = o.proposalProducts.map((p) => {
      if (p.insurerId) return p;
      const hit = findInsurerByName(companies, p.insurer);
      if (!hit) return p;
      changed = true;
      return { ...p, insurerId: hit.id };
    });
    return products.some((p, i) => p !== o.proposalProducts![i]) ? { ...o, proposalProducts: products } : o;
  });
  return changed ? out : opps;
}

/** 商品の表示名: マスタに insurerId があればマスタ名、無ければ自由記述 */
export function isOutsideMaster(
  companies: InsuranceCompany[],
  p: { insurer: string; insurerId?: string },
): boolean {
  if (p.insurerId && companies.some((c) => c.id === p.insurerId)) return false;
  return !!p.insurer?.trim();
}

/**
 * E1: 商品カテゴリから保険会社の区分（生保/損保）を決める。
 * 自動車・火災・賠償責任=損保、その他の保障/貯蓄系=生保、"other" は絞り込まない(undefined)。
 */
export function insurerKindForCategory(category: string): InsurerKind | undefined {
  switch (category) {
    case "auto":
    case "fire":
    case "liability":
      return "non_life";
    case "life":
    case "medical":
    case "cancer":
    case "income":
    case "nursing":
    case "savings":
      return "life";
    default:
      return undefined;
  }
}
