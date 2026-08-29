// =====================================================
// salesPerf/data/seed/contracts-shared.ts — 共有定数・ヘルパー
// =====================================================

// ★ 意図的異常値一覧 (正規化テスト用)
// 1. id='c_anom_01': monthly_premium="500万円" (金額文字列)
// 2. id='c_anom_02': monthly_premium="22000ドル" (変換不能文字列)
// 3. id='c_anom_03': first_year_commission="1.5百万円" (百万円文字列)
// 4. id='c_anom_04': confidence="確定済" (表記ゆれ=unknown扱い)
// 5. id='c_anom_05': established_date="2023-05-15" (FY2025から外れる=fy_mismatch)
// 6. id='c_anom_06': insurer="" (欠損→未分類)
// 7. id='c_anom_07': channel="" (欠損→未分類)
// 8. id='c_anom_08': product_type="" (欠損→未分類)
// 9. id='c_anom_09': monthly_premium="3,200,000" (カンマ区切り=正常パース可)
// 10. id='c_anom_10': confidence="s" (小文字=正規化可)
// 11. id='c_anom_11': established_date=undefined (未計上)
// 12. id='c_anom_12': monthly_premium="￥450000" (全角円記号)
// 13. id='c_anom_13': first_year_commission="" (空文字=null)
// 14. id='c_anom_14': monthly_premium="0" (ゼロ)
// 15. id='c_anom_15': fiscal_year=2024 established_date="2024-12-01" (FY2024=FY2025外)

export const OWNERS = [
  "sp_u1",
  "sp_u2",
  "sp_u3",
  "sp_u4",
  "sp_u5",
  "sp_u6",
  "sp_u7",
] as const;
export const GROUPS: Record<string, string> = {
  sp_u1: "sp_g1",
  sp_u2: "sp_g1",
  sp_u3: "sp_g1",
  sp_u4: "sp_g2",
  sp_u5: "sp_g2",
  sp_u6: "sp_gm",
  sp_u7: "sp_gm",
};

export const INSURERS_LIFE = [
  "第一生命",
  "日本生命",
  "明治安田生命",
  "住友生命",
  "メットライフ生命",
  "アフラック",
];
export const INSURERS_NONLIFE = [
  "東京海上日動",
  "損保ジャパン",
  "あいおいニッセイ",
  "MS&AD",
  "チューリッヒ",
];
export const PT_LIFE = [
  "終身保険",
  "定期保険",
  "医療保険",
  "がん保険",
  "個人年金",
  "変額保険",
];
export const PT_NONLIFE = [
  "自動車保険",
  "火災保険",
  "傷害保険",
  "賠償責任保険",
  "企業総合",
  "所得補償",
];
export const CHANNELS = [
  "紹介",
  "飛込",
  "提携先経由",
  "既存顧客深耕",
  "DM反響",
  "セミナー",
  "SNS",
];
export const PARTNERS = [
  "JAバンク",
  "信用金庫",
  "不動産会社A",
  "不動産会社B",
  "ファイナンシャルG",
  "直接",
  "商工会議所",
];

export const CONF_LIFE = ["確定", "S", "A", "B", "初見"];
export const CONF_NONLIFE = ["確定", "S", "A", "B", "C", "D"];

// Simple deterministic pseudo-random based on index
export function pr(seed: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return Math.abs(Math.floor(x % max));
}
export function prb(seed: number): boolean {
  return pr(seed, 2) === 0;
}

export function fy2025Date(fiscalMonth: number, seed: number): string {
  // 会計月1=4月,2=5月,...,12=3月 → 暦月
  const calMonth = ((fiscalMonth - 1 + 3) % 12) + 1;
  const year = calMonth >= 4 ? 2025 : 2026;
  const day = pr(seed, 28) + 1;
  return `${year}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
