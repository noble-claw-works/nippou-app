// =====================================================
// salesPerf/data/seedContracts.ts — 架空契約データ (300行)
// 意図的な欠損・異常値を混入してテスト用途に対応
// =====================================================
import type { SalesContractRaw, SalesTargetRow } from '../types';

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

const OWNERS = ['sp_u1', 'sp_u2', 'sp_u3', 'sp_u4', 'sp_u5', 'sp_u6', 'sp_u7'] as const;
const GROUPS: Record<string, string> = {
  sp_u1: 'sp_g1', sp_u2: 'sp_g1', sp_u3: 'sp_g1',
  sp_u4: 'sp_g2', sp_u5: 'sp_g2',
  sp_u6: 'sp_gm', sp_u7: 'sp_gm',
};

const INSURERS_LIFE    = ['第一生命', '日本生命', '明治安田生命', '住友生命', 'メットライフ生命', 'アフラック'];
const INSURERS_NONLIFE = ['東京海上日動', '損保ジャパン', 'あいおいニッセイ', 'MS&AD', 'チューリッヒ'];
const PT_LIFE    = ['終身保険', '定期保険', '医療保険', 'がん保険', '個人年金', '変額保険'];
const PT_NONLIFE = ['自動車保険', '火災保険', '傷害保険', '賠償責任保険', '企業総合', '所得補償'];
const CHANNELS   = ['紹介', '飛込', '提携先経由', '既存顧客深耕', 'DM反響', 'セミナー', 'SNS'];
const PARTNERS   = ['JAバンク', '信用金庫', '不動産会社A', '不動産会社B', 'ファイナンシャルG', '直接', '商工会議所'];

const CONF_LIFE    = ['確定', 'S', 'A', 'B', '初見'];
const CONF_NONLIFE = ['確定', 'S', 'A', 'B', 'C', 'D'];

// Simple deterministic pseudo-random based on index
function pr(seed: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return Math.abs(Math.floor(x % max));
}
function prb(seed: number): boolean { return pr(seed, 2) === 0; }

function fy2025Date(fiscalMonth: number, seed: number): string {
  // 会計月1=4月,2=5月,...,12=3月 → 暦月
  const calMonth = ((fiscalMonth - 1 + 3) % 12) + 1;
  const year = calMonth >= 4 ? 2025 : 2026;
  const day = (pr(seed, 28) + 1);
  return `${year}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 正規契約 (285件)
const normalContracts: SalesContractRaw[] = [];
for (let i = 0; i < 285; i++) {
  const isLife = pr(i, 2) === 0;
  const line = isLife ? 'life' : 'nonlife';
  const ownerIdx = pr(i + 100, OWNERS.length);
  const ownerId = OWNERS[ownerIdx];
  const fiscalMonth = pr(i + 200, 12) + 1;
  const confArr = isLife ? CONF_LIFE : CONF_NONLIFE;
  const confIdx = pr(i + 300, confArr.length);
  const confidence = confArr[confIdx];
  const insurer = isLife
    ? INSURERS_LIFE[pr(i + 400, INSURERS_LIFE.length)]
    : INSURERS_NONLIFE[pr(i + 400, INSURERS_NONLIFE.length)];
  const pt = isLife
    ? PT_LIFE[pr(i + 500, PT_LIFE.length)]
    : PT_NONLIFE[pr(i + 500, PT_NONLIFE.length)];
  const channel = CHANNELS[pr(i + 600, CHANNELS.length)];
  const partner = PARTNERS[pr(i + 700, PARTNERS.length)];

  // 月払保険料 (3000〜50000)
  const premium = (pr(i + 800, 48) + 3) * 1000;
  // 初年度手数料 (保険料の30〜60%)
  const commRate = (pr(i + 900, 31) + 30) / 100;
  const comm = Math.round(premium * commRate * 12);

  normalContracts.push({
    id: `c_${String(i + 1).padStart(4, '0')}`,
    line,
    fiscal_year: 2025,
    owner_id: ownerId,
    group_id: GROUPS[ownerId],
    channel,
    partner,
    insurer,
    product_type: pt,
    monthly_premium: premium,
    first_year_commission: comm,
    confidence,
    application_date: fy2025Date(fiscalMonth, i + 1000),
    established_date: confidence === '確定' ? fy2025Date(fiscalMonth, i + 1100) : undefined,
    had_meeting: prb(i + 1200),
    had_lifeplan: isLife && prb(i + 1300),
    policy_collected: confidence === '確定' && prb(i + 1400),
    had_proposal: prb(i + 1500),
    household_id: `hh_${String(pr(i + 1600, 150) + 1).padStart(4, '0')}`,
  });
}

// 前年度 FY2024 データ (20件, 比較用)
for (let i = 0; i < 20; i++) {
  const isLife = pr(i + 1700, 2) === 0;
  const line = isLife ? 'life' : 'nonlife';
  const ownerIdx = pr(i + 1800, OWNERS.length);
  const ownerId = OWNERS[ownerIdx];
  const calMonth = pr(i + 1900, 12) + 1;
  const year = calMonth >= 4 ? 2024 : 2025;
  const day = (pr(i + 2000, 28) + 1);
  const insurer = isLife ? INSURERS_LIFE[pr(i + 2100, INSURERS_LIFE.length)] : INSURERS_NONLIFE[pr(i + 2100, INSURERS_NONLIFE.length)];
  const pt = isLife ? PT_LIFE[pr(i + 2200, PT_LIFE.length)] : PT_NONLIFE[pr(i + 2200, PT_NONLIFE.length)];
  const premium = (pr(i + 2300, 48) + 3) * 1000;
  const comm = Math.round(premium * 0.4 * 12);

  normalContracts.push({
    id: `c_fy24_${String(i + 1).padStart(3, '0')}`,
    line,
    fiscal_year: 2024,
    owner_id: ownerId,
    group_id: GROUPS[ownerId],
    channel: CHANNELS[pr(i + 2400, CHANNELS.length)],
    partner: PARTNERS[pr(i + 2500, PARTNERS.length)],
    insurer,
    product_type: pt,
    monthly_premium: premium,
    first_year_commission: comm,
    confidence: '確定',
    established_date: `${year}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    had_meeting: true,
    had_lifeplan: isLife && prb(i + 2600),
    policy_collected: true,
    had_proposal: true,
    household_id: `hh_fy24_${String(pr(i + 2700, 80) + 1).padStart(3, '0')}`,
  });
}

// ★ 意図的異常値 (15件)
const anomalyContracts: SalesContractRaw[] = [
  {
    id: 'c_anom_01',
    line: 'life',
    fiscal_year: 2025,
    owner_id: 'sp_u1',
    group_id: 'sp_g1',
    channel: '紹介',
    partner: '直接',
    insurer: '第一生命',
    product_type: '終身保険',
    monthly_premium: '500万円',           // ★金額文字列
    first_year_commission: 600000,
    confidence: 'S',
    established_date: '2025-07-10',
    had_meeting: true,
    had_lifeplan: true,
    had_proposal: true,
    policy_collected: false,
    household_id: 'hh_anom_01',
  },
  {
    id: 'c_anom_02',
    line: 'nonlife',
    fiscal_year: 2025,
    owner_id: 'sp_u2',
    group_id: 'sp_g1',
    channel: '提携先経由',
    partner: 'JAバンク',
    insurer: '東京海上日動',
    product_type: '自動車保険',
    monthly_premium: '22000ドル',         // ★変換不能文字列
    first_year_commission: 200000,
    confidence: 'A',
    established_date: '2025-09-01',
    had_meeting: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_02',
  },
  {
    id: 'c_anom_03',
    line: 'life',
    fiscal_year: 2025,
    owner_id: 'sp_u3',
    group_id: 'sp_g1',
    channel: '紹介',
    partner: '直接',
    insurer: '日本生命',
    product_type: '個人年金',
    monthly_premium: 30000,
    first_year_commission: '1.5百万円',  // ★百万円文字列
    confidence: '確定',
    established_date: '2025-06-15',
    had_meeting: true,
    had_lifeplan: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_03',
  },
  {
    id: 'c_anom_04',
    line: 'nonlife',
    fiscal_year: 2025,
    owner_id: 'sp_u4',
    group_id: 'sp_g2',
    channel: '飛込',
    partner: '直接',
    insurer: '損保ジャパン',
    product_type: '火災保険',
    monthly_premium: 15000,
    first_year_commission: 90000,
    confidence: '確定済',               // ★表記ゆれ → unknown
    established_date: '2025-08-20',
    had_meeting: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_04',
  },
  {
    id: 'c_anom_05',
    line: 'life',
    fiscal_year: 2025,
    owner_id: 'sp_u5',
    group_id: 'sp_g2',
    channel: '紹介',
    partner: '直接',
    insurer: '住友生命',
    product_type: '医療保険',
    monthly_premium: 20000,
    first_year_commission: 150000,
    confidence: '確定',
    established_date: '2023-05-15',     // ★FY2025外 → fy_mismatch
    had_meeting: true,
    had_lifeplan: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_05',
  },
  {
    id: 'c_anom_06',
    line: 'nonlife',
    fiscal_year: 2025,
    owner_id: 'sp_u1',
    group_id: 'sp_g1',
    channel: '既存顧客深耕',
    partner: '直接',
    insurer: '',                        // ★欠損 → 未分類
    product_type: '自動車保険',
    monthly_premium: 18000,
    first_year_commission: 108000,
    confidence: 'B',
    established_date: '2025-11-05',
    had_meeting: true,
    had_proposal: false,
    household_id: 'hh_anom_06',
  },
  {
    id: 'c_anom_07',
    line: 'life',
    fiscal_year: 2025,
    owner_id: 'sp_u2',
    group_id: 'sp_g1',
    channel: '',                        // ★欠損 → 未分類
    partner: '直接',
    insurer: 'アフラック',
    product_type: 'がん保険',
    monthly_premium: 8000,
    first_year_commission: 57600,
    confidence: 'A',
    application_date: '2025-05-01',
    had_meeting: true,
    had_lifeplan: false,
    had_proposal: true,
    household_id: 'hh_anom_07',
  },
  {
    id: 'c_anom_08',
    line: 'nonlife',
    fiscal_year: 2025,
    owner_id: 'sp_u3',
    group_id: 'sp_g1',
    channel: 'セミナー',
    partner: '商工会議所',
    insurer: 'あいおいニッセイ',
    product_type: '',                   // ★欠損 → 未分類
    monthly_premium: 25000,
    first_year_commission: 180000,
    confidence: 'S',
    established_date: '2025-12-20',
    had_meeting: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_08',
  },
  {
    id: 'c_anom_09',
    line: 'life',
    fiscal_year: 2025,
    owner_id: 'sp_u4',
    group_id: 'sp_g2',
    channel: 'DM反響',
    partner: '直接',
    insurer: 'メットライフ生命',
    product_type: '変額保険',
    monthly_premium: '3,200,000',      // ★カンマ区切り → 正常パース可
    first_year_commission: 384000,
    confidence: '確定',
    established_date: '2025-10-08',
    had_meeting: true,
    had_lifeplan: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_09',
  },
  {
    id: 'c_anom_10',
    line: 'nonlife',
    fiscal_year: 2025,
    owner_id: 'sp_u5',
    group_id: 'sp_g2',
    channel: '紹介',
    partner: '不動産会社A',
    insurer: 'MS&AD',
    product_type: '傷害保険',
    monthly_premium: 12000,
    first_year_commission: 86400,
    confidence: 's',                   // ★小文字 → S に正規化可
    established_date: '2026-01-15',
    had_meeting: true,
    had_proposal: true,
    policy_collected: false,
    household_id: 'hh_anom_10',
  },
  {
    id: 'c_anom_11',
    line: 'life',
    fiscal_year: 2025,
    owner_id: 'sp_u6',
    group_id: 'sp_gm',
    channel: '紹介',
    partner: '直接',
    insurer: '第一生命',
    product_type: '定期保険',
    monthly_premium: 35000,
    first_year_commission: 252000,
    confidence: 'B',
    // ★established_date=undefined (未計上)
    had_meeting: true,
    had_lifeplan: false,
    had_proposal: false,
    household_id: 'hh_anom_11',
  },
  {
    id: 'c_anom_12',
    line: 'nonlife',
    fiscal_year: 2025,
    owner_id: 'sp_u7',
    group_id: 'sp_gm',
    channel: '既存顧客深耕',
    partner: '直接',
    insurer: '東京海上日動',
    product_type: '企業総合',
    monthly_premium: '￥450000',       // ★全角円記号
    first_year_commission: 540000,
    confidence: '確定',
    established_date: '2025-04-25',
    had_meeting: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_12',
  },
  {
    id: 'c_anom_13',
    line: 'life',
    fiscal_year: 2025,
    owner_id: 'sp_u1',
    group_id: 'sp_g1',
    channel: 'SNS',
    partner: '直接',
    insurer: '住友生命',
    product_type: '終身保険',
    monthly_premium: 22000,
    first_year_commission: '',         // ★空文字 → null
    confidence: 'A',
    established_date: '2025-08-12',
    had_meeting: true,
    had_lifeplan: true,
    had_proposal: true,
    household_id: 'hh_anom_13',
  },
  {
    id: 'c_anom_14',
    line: 'nonlife',
    fiscal_year: 2025,
    owner_id: 'sp_u2',
    group_id: 'sp_g1',
    channel: '飛込',
    partner: '直接',
    insurer: '損保ジャパン',
    product_type: '賠償責任保険',
    monthly_premium: 0,                // ★ゼロ
    first_year_commission: 0,
    confidence: 'D',
    application_date: '2025-09-20',
    had_meeting: false,
    had_proposal: false,
    household_id: 'hh_anom_14',
  },
  {
    id: 'c_anom_15',
    line: 'life',
    fiscal_year: 2024,                 // ★FY2024データ
    owner_id: 'sp_u3',
    group_id: 'sp_g1',
    channel: '紹介',
    partner: '信用金庫',
    insurer: '日本生命',
    product_type: '医療保険',
    monthly_premium: 15000,
    first_year_commission: 108000,
    confidence: '確定',
    established_date: '2024-12-01',    // ★FY2024内: FY2025で集計すると不整合
    had_meeting: true,
    had_lifeplan: true,
    had_proposal: true,
    policy_collected: true,
    household_id: 'hh_anom_15',
  },
];

export const SEED_CONTRACTS: SalesContractRaw[] = [
  ...normalContracts,
  ...anomalyContracts,
];

// =====================================================
// 予算・目標 (line × fy × scope × month)
// =====================================================

// 全体予算: FY2025 月次 (会計月1-12)
const TOTAL_LIFE_BUDGET_BY_MONTH: number[] = [
  3800000, 3600000, 4000000, 4200000, 4100000, 3900000,  // 4-9月
  4500000, 4300000, 4800000, 4000000, 3700000, 4100000,  // 10-3月
];
const TOTAL_NONLIFE_BUDGET_BY_MONTH: number[] = [
  4400000, 4200000, 4600000, 4800000, 4700000, 4500000,  // 4-9月
  5200000, 5000000, 5500000, 4600000, 4300000, 4900000,  // 10-3月
];

// グループ予算 (G1, G2, 管理)
const G1_LIFE_RATIO = 0.45;
const G2_LIFE_RATIO = 0.35;
const G1_NONLIFE_RATIO = 0.42;
const G2_NONLIFE_RATIO = 0.38;

// 個人予算 (7名)
const INDIVIDUAL_LIFE_RATIOS: Record<string, number> = {
  sp_u1: 0.18, sp_u2: 0.15, sp_u3: 0.12,  // G1
  sp_u4: 0.14, sp_u5: 0.13,                // G2
  sp_u6: 0.08, sp_u7: 0.06,                // 管理
};
const INDIVIDUAL_NONLIFE_RATIOS: Record<string, number> = {
  sp_u1: 0.16, sp_u2: 0.14, sp_u3: 0.12,
  sp_u4: 0.15, sp_u5: 0.14,
  sp_u6: 0.09, sp_u7: 0.08,
};

function buildTargets(): SalesTargetRow[] {
  const rows: SalesTargetRow[] = [];

  for (let m = 1; m <= 12; m++) {
    const lifeAmt = TOTAL_LIFE_BUDGET_BY_MONTH[m - 1];
    const nlAmt = TOTAL_NONLIFE_BUDGET_BY_MONTH[m - 1];

    // 全体
    rows.push({ line: 'life',    fiscalYear: 2025, scopeType: 'all', scopeId: 'ALL', month: m, amount: lifeAmt });
    rows.push({ line: 'nonlife', fiscalYear: 2025, scopeType: 'all', scopeId: 'ALL', month: m, amount: nlAmt });

    // FY2024 全体 (前年比用)
    rows.push({ line: 'life',    fiscalYear: 2024, scopeType: 'all', scopeId: 'ALL', month: m, amount: Math.round(lifeAmt * 0.92) });
    rows.push({ line: 'nonlife', fiscalYear: 2024, scopeType: 'all', scopeId: 'ALL', month: m, amount: Math.round(nlAmt * 0.88) });

    // G1
    rows.push({ line: 'life',    fiscalYear: 2025, scopeType: 'group', scopeId: 'sp_g1', month: m, amount: Math.round(lifeAmt * G1_LIFE_RATIO) });
    rows.push({ line: 'nonlife', fiscalYear: 2025, scopeType: 'group', scopeId: 'sp_g1', month: m, amount: Math.round(nlAmt * G1_NONLIFE_RATIO) });
    // G2
    rows.push({ line: 'life',    fiscalYear: 2025, scopeType: 'group', scopeId: 'sp_g2', month: m, amount: Math.round(lifeAmt * G2_LIFE_RATIO) });
    rows.push({ line: 'nonlife', fiscalYear: 2025, scopeType: 'group', scopeId: 'sp_g2', month: m, amount: Math.round(nlAmt * G2_NONLIFE_RATIO) });
    // 管理G
    rows.push({ line: 'life',    fiscalYear: 2025, scopeType: 'group', scopeId: 'sp_gm', month: m, amount: Math.round(lifeAmt * (1 - G1_LIFE_RATIO - G2_LIFE_RATIO)) });
    rows.push({ line: 'nonlife', fiscalYear: 2025, scopeType: 'group', scopeId: 'sp_gm', month: m, amount: Math.round(nlAmt * (1 - G1_NONLIFE_RATIO - G2_NONLIFE_RATIO)) });

    // 個人
    for (const [uid, ratio] of Object.entries(INDIVIDUAL_LIFE_RATIOS)) {
      rows.push({ line: 'life', fiscalYear: 2025, scopeType: 'individual', scopeId: uid, month: m, amount: Math.round(lifeAmt * ratio) });
    }
    for (const [uid, ratio] of Object.entries(INDIVIDUAL_NONLIFE_RATIOS)) {
      rows.push({ line: 'nonlife', fiscalYear: 2025, scopeType: 'individual', scopeId: uid, month: m, amount: Math.round(nlAmt * ratio) });
    }
  }

  return rows;
}

export const SEED_TARGETS: SalesTargetRow[] = buildTargets();
