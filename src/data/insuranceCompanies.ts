// =====================================================
// insuranceCompanies.ts — 保険会社（取扱会社）マスタ初期データ
// 仮の 12 社（Q7: 正式な取扱会社リストは主上提供後に差し替え）。
// kind = 生保/損保、aliases = 既存の自由記述に出る略称（完全一致で insurerId を補完）。
// =====================================================
import type { InsuranceCompany } from "../types/insurance";

export const INITIAL_INSURANCE_COMPANIES: InsuranceCompany[] = [
  { id: "ic_01", name: "日本生命保険", isActive: true, order: 1, kind: "life", aliases: ["日本生命"] },
  { id: "ic_02", name: "第一生命保険", isActive: true, order: 2, kind: "life", aliases: ["第一生命"] },
  { id: "ic_03", name: "住友生命保険", isActive: true, order: 3, kind: "life", aliases: ["住友生命"] },
  { id: "ic_04", name: "明治安田生命保険", isActive: true, order: 4, kind: "life", aliases: ["明治安田生命", "明治安田"] },
  { id: "ic_05", name: "東京海上日動火災保険", isActive: true, order: 5, kind: "non_life", aliases: ["東京海上日動", "東京海上"] },
  { id: "ic_06", name: "損害保険ジャパン", isActive: true, order: 6, kind: "non_life", aliases: ["損保ジャパン"] },
  { id: "ic_07", name: "三井住友海上火災保険", isActive: true, order: 7, kind: "non_life", aliases: ["三井住友海上"] },
  { id: "ic_08", name: "ソニー生命保険", isActive: true, order: 8, kind: "life", aliases: ["ソニー生命"] },
  { id: "ic_09", name: "オリックス生命保険", isActive: true, order: 9, kind: "life", aliases: ["オリックス生命"] },
  { id: "ic_10", name: "アフラック生命保険", isActive: true, order: 10, kind: "life", aliases: ["アフラック"] },
  { id: "ic_11", name: "富国生命保険", isActive: true, order: 11, kind: "life", aliases: ["富国生命"] },
  { id: "ic_12", name: "朝日生命保険", isActive: true, order: 12, kind: "life", aliases: ["朝日生命"] },
  // 2026-11-20 テスター第2回報告: 追加（既存ブラウザへは mergeInsuranceCompanies が読み込み時に補う）
  { id: "ic_13", name: "東京海上日動あんしん生命保険", isActive: true, order: 13, kind: "life", aliases: ["あんしん生命", "東京海上日動あんしん生命"] },
  { id: "ic_14", name: "ネオファースト生命保険", isActive: true, order: 14, kind: "life", aliases: ["ネオファースト生命", "ネオファースト"] },
  { id: "ic_15", name: "メットライフ生命保険", isActive: true, order: 15, kind: "life", aliases: ["メットライフ生命", "メットライフ"] },
];
