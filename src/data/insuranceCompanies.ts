// =====================================================
// insuranceCompanies.ts — 保険会社マスタ初期データ
// =====================================================
import type { InsuranceCompany } from "../types/insurance";

export const INITIAL_INSURANCE_COMPANIES: InsuranceCompany[] = [
  { id: "ic_01", name: "日本生命保険", isActive: true, order: 1 },
  { id: "ic_02", name: "第一生命保険", isActive: true, order: 2 },
  { id: "ic_03", name: "住友生命保険", isActive: true, order: 3 },
  { id: "ic_04", name: "明治安田生命保険", isActive: true, order: 4 },
  { id: "ic_05", name: "東京海上日動火災保険", isActive: true, order: 5 },
  { id: "ic_06", name: "損害保険ジャパン", isActive: true, order: 6 },
  { id: "ic_07", name: "三井住友海上火災保険", isActive: true, order: 7 },
  { id: "ic_08", name: "ソニー生命保険", isActive: true, order: 8 },
  { id: "ic_09", name: "オリックス生命保険", isActive: true, order: 9 },
  { id: "ic_10", name: "アフラック生命保険", isActive: true, order: 10 },
  { id: "ic_11", name: "富国生命保険", isActive: true, order: 11 },
  { id: "ic_12", name: "朝日生命保険", isActive: true, order: 12 },
];
