// =====================================================
// roadmapTemplate.ts — ロードマップ テンプレ項目の検証/整序（Doc5 §2.5 / T5-07）
// 純関数（store 非依存）。①〜④は最大4件の可変リスト。
// 発行(publish)前の UI バリデーションと表示整序に使う。
// =====================================================
import type { RenewalRoadmapItemDef } from "../types";

/** ①〜④の可変リスト上限（§0 確定事項⑤） */
export const MAX_ROADMAP_ITEMS = 4;

export interface RoadmapItemsValidation {
  ok: boolean;
  errors: string[];
}

/**
 * テンプレ項目リストを発行前に検証する。
 * - 件数は最大 MAX_ROADMAP_ITEMS(4) 件。
 * - 有効(active)な項目は表示名(label)必須。
 * - 項目定義id(id)は重複不可（版をまたいで安定させるため）。
 * - order は重複不可（並び順の一意性）。
 */
export function validateRoadmapItems(
  items: RenewalRoadmapItemDef[],
): RoadmapItemsValidation {
  const errors: string[] = [];

  if (items.length > MAX_ROADMAP_ITEMS) {
    errors.push(`①〜④は最大${MAX_ROADMAP_ITEMS}件までです（現在${items.length}件）`);
  }

  for (const it of items) {
    if (it.active && it.label.trim() === "") {
      errors.push("有効な項目の表示名は必須です");
      break;
    }
  }

  const ids = items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) {
    errors.push("項目定義idが重複しています");
  }

  const orders = items.map((i) => i.order);
  if (new Set(orders).size !== orders.length) {
    errors.push("並び順(order)が重複しています");
  }

  return { ok: errors.length === 0, errors };
}

/** order 昇順でソートした新配列を返す（非破壊） */
export function sortRoadmapItems(
  items: RenewalRoadmapItemDef[],
): RenewalRoadmapItemDef[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/** 有効(active)な項目のみ order 昇順で返す（回答 UI 表示用） */
export function activeRoadmapItems(
  items: RenewalRoadmapItemDef[],
): RenewalRoadmapItemDef[] {
  return sortRoadmapItems(items.filter((i) => i.active));
}
