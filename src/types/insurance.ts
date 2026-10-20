// =====================================================
// insurance.ts — 保険会社マスタ / 種目マスタ型
// =====================================================

/** 保険会社マスタ */
export interface InsuranceCompany {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
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
