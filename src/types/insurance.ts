// =====================================================
// insurance.ts — 保険会社マスタ / 種目マスタ型
// =====================================================

/** 取扱会社の区分（生保 / 損保） */
export type InsurerKind = "life" | "non_life";

/** 保険会社（取扱会社）マスタ */
export interface InsuranceCompany {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
  /** 生保/損保区分（B3）。旧データは未設定 → 読み込み時に初期データから補完 */
  kind?: InsurerKind;
  /** 別名（略称・旧称）。自由記述の会社名を insurerId に補完するときの完全一致対象 */
  aliases?: string[];
}

/** 種目（ProductCategory）マスタ — 編集可能マスタ昇格版 */
export interface ProductCategoryMaster {
  id: string;
  /** 表示名（例: "生命保険"） */
  name: string;
  /** ProductCategory enum値（後方互換キー）*/
  categoryKey: string;
  isActive: boolean;
  order: number;
}
