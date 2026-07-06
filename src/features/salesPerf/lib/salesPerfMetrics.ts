// =====================================================
// salesPerfMetrics.ts — 全KPI集計 (純関数・単一集約)
//
// 集計方針:
//   - 分母0 → null を返す (表示側で "−")
//   - 金額系 null (要確認) は集計除外
//   - 件数系は可能な範囲で計上 (金額nullでも件数はカウント)
//   - 会計年度: 4月始まり (constants.ts 参照)
//   - 既存 salesPeriod.ts (暦年) は流用しない
// =====================================================

import type {
  SalesContract,
  SalesTargetRow,
  SalesPerfFilter,
  SalesPerfMasters,
  KpiSummary,
  MonthlyPoint,
  ConfidenceStackPoint,
  OwnerRankRow,
  FunnelMetrics,
  DataQuality,
} from '../types';
import { fiscalMonthRange, fiscalMonthToCalMonth, FISCAL_MONTH_LABELS } from '../constants';
import { getScopeUserIds, ownerName } from './salePerfScope';

// ----------------------------------------
// 内部ユーティリティ
// ----------------------------------------

/** 分母0ガード: 0除算を防ぐ。どちらかが null でも null */
function safeDiv(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

/** 集計に使う firstYearCommission (null は除外) */
function validCommission(c: SalesContract): number {
  return c.firstYearCommission ?? 0;
}

// ----------------------------------------
// フィルタ適用
// ----------------------------------------

/**
 * フィルタ + スコープを適用してコントラクト配列を絞り込む。
 * 対象 fiscalYear の contracts のみ返す。
 */
export function applyFilter(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  scopeUserIds: string[],
): SalesContract[] {
  const months = fiscalMonthRange(filter.periodMode, filter.singleMonth);

  return contracts.filter(c => {
    // 会計年度
    if (c.fiscalYear !== filter.fiscalYear) return false;
    // スコープ (担当者)
    if (!scopeUserIds.includes(c.ownerId)) return false;
    // 商品ライン
    if (filter.line !== 'both' && c.line !== filter.line) return false;
    // 保険会社
    if (filter.insurer && c.insurer !== filter.insurer) return false;
    // 種目
    if (filter.productType && c.productType !== filter.productType) return false;
    // チャネル
    if (filter.channel && c.channel !== filter.channel) return false;
    // 期間 (month が null の未計上は full/h1/h2 では含む。singleMonth は除外)
    if (filter.periodMode === 'single') {
      if (c.month === null) return false;
      if (!months.includes(c.month)) return false;
    }
    return true;
  });
}

/** 確度シナリオでの確定コントラクト判定 */
function isInScenario(c: SalesContract, scenario: SalesPerfFilter['confidenceScenario']): boolean {
  if (!c.confidenceAgg) return false;
  if (scenario === 'fixed') return c.confidenceAgg === 'fixed';
  if (scenario === 'fixed_s') return c.confidenceAgg === 'fixed' || c.confidenceAgg === 'fixed_s';
  // fixed_s_a
  return true; // fixed / fixed_s / fixed_s_a すべて含む
}

/** ターゲット合計 */
function sumTargets(
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  scopeType: 'all' | 'group' | 'individual',
  scopeId: string,
  months?: number[],
): number {
  const mths = months ?? fiscalMonthRange(filter.periodMode, filter.singleMonth);
  return targets
    .filter(t =>
      t.fiscalYear === filter.fiscalYear &&
      (filter.line === 'both' || t.line === filter.line) &&
      t.scopeType === scopeType &&
      t.scopeId === scopeId &&
      mths.includes(t.month),
    )
    .reduce((s, t) => s + t.amount, 0);
}

// ----------------------------------------
// T0-4: KPI集計 (S1)
// ----------------------------------------

/**
 * KPIサマリー: 年間予算/確定手数料/進捗率/目標差額/前年比
 */
export function kpiSummary(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): KpiSummary {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  // 確度シナリオ内の確定分
  const inScenario = filtered.filter(c => isInScenario(c, filter.confidenceScenario));
  const confirmedCommission = inScenario.reduce((s, c) => s + validCommission(c), 0);

  // 予算積上げ (scope=all で全体)
  const annualBudget = sumTargets(targets, filter, 'all', 'ALL');

  const progressRate = safeDiv(confirmedCommission * 100, annualBudget);
  const budgetGap = confirmedCommission - annualBudget;

  // 前年比
  const prevFilter: SalesPerfFilter = { ...filter, fiscalYear: filter.fiscalYear - 1 };
  const prevContracts = contracts.filter(c => c.fiscalYear === filter.fiscalYear - 1);
  const prevFiltered = applyFilter(prevContracts, prevFilter, scopeIds);
  const prevInScenario = prevFiltered.filter(c => isInScenario(c, filter.confidenceScenario));
  const prevCommission = prevInScenario.reduce((s, c) => s + validCommission(c), 0);
  const yoyRate = safeDiv(confirmedCommission * 100, prevCommission);

  return { annualBudget, confirmedCommission, progressRate, budgetGap, yoyRate };
}

/**
 * 月次手数料 vs 予算
 */
export function monthlyCommissionVsBudget(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): MonthlyPoint[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  let cumActual = 0;
  let cumBudget = 0;

  return months.map(m => {
    const monthContracts = filtered.filter(c =>
      c.month === m && isInScenario(c, filter.confidenceScenario),
    );
    const actual = monthContracts.reduce((s, c) => s + validCommission(c), 0);
    const budget = sumTargets(targets, { ...filter, periodMode: 'single', singleMonth: m }, 'all', 'ALL', [m]);
    cumActual += actual;
    cumBudget += budget;

    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);
    return {
      month: m,
      calMonth: `${cy}-${String(cm).padStart(2, '0')}`,
      actual,
      budget,
      cumActual,
      cumBudget,
    };
  });
}

/**
 * 確度別積上げ棒グラフデータ (月次)
 */
export function stackedByConfidence(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): ConfidenceStackPoint[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return months.map(m => {
    const mc = filtered.filter(c => c.month === m);
    const sum = (code: string) =>
      mc.filter(c => c.confidenceCode === code).reduce((s, c) => s + validCommission(c), 0);
    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);
    return {
      month: m,
      calMonth: `${cy}-${String(cm).padStart(2, '0')}`,
      fixed: sum('fixed'),
      S: sum('S'),
      A: sum('A'),
      B: sum('B'),
      C: sum('C'),
      D: sum('D'),
      first: sum('first'),
    };
  });
}

/**
 * 担当者進捗ランキング
 */
export function ownerRanking(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): OwnerRankRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  return scopeIds.map(uid => {
    const ownerContracts = filtered.filter(c =>
      c.ownerId === uid && isInScenario(c, filter.confidenceScenario),
    );
    const commission = ownerContracts.reduce((s, c) => s + validCommission(c), 0);
    const budget = sumTargets(targets, filter, 'individual', uid);
    const progressRate = safeDiv(commission * 100, budget);
    return {
      ownerId: uid,
      ownerName: ownerName(uid, masters),
      commission,
      budget,
      progressRate,
    };
  }).sort((a, b) => (b.progressRate ?? -1) - (a.progressRate ?? -1));
}

// ----------------------------------------
// S2: 予算・目標
// ----------------------------------------

export interface BudgetTableRow {
  month: number;
  label: string;
  calMonth: string;
  actual: number;
  actual_s: number;
  actual_s_a: number;
  budget: number;
  cumBudget: number;
  progressRate: number | null;
}

export function budgetTable(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): BudgetTableRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  let cumBudget = 0;

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
    const mc = filtered.filter(c => c.month === m);
    const actual = mc.filter(c => c.confidenceAgg === 'fixed').reduce((s, c) => s + validCommission(c), 0);
    const actual_s = mc.filter(c => c.confidenceAgg === 'fixed' || c.confidenceAgg === 'fixed_s').reduce((s, c) => s + validCommission(c), 0);
    const actual_s_a = mc.reduce((s, c) => s + validCommission(c), 0);
    const budget = sumTargets(targets, { ...filter, periodMode: 'single', singleMonth: m }, 'all', 'ALL', [m]);
    cumBudget += budget;
    const progressRate = safeDiv(actual * 100, cumBudget);
    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);
    return {
      month: m,
      label: FISCAL_MONTH_LABELS[m],
      calMonth: `${cy}-${String(cm).padStart(2, '0')}`,
      actual, actual_s, actual_s_a,
      budget,
      cumBudget,
      progressRate,
    };
  });
}

// ----------------------------------------
// S3: プロセス
// ----------------------------------------

/**
 * ファネル指標: 商談→LP→提案→証券回収→契約世帯→件数 + 転換率
 */
export function funnelMetrics(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): FunnelMetrics {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  const meetings = filtered.filter(c => c.hadMeeting).length;
  const lifeplans = filtered.filter(c => c.hadLifeplan).length;
  const proposals = filtered.filter(c => c.hadProposal).length;
  const policyCollections = filtered.filter(c => c.policyCollected).length;
  // 契約世帯数 (ユニーク household)
  const confirmedContracts = filtered.filter(c => c.confidenceCode === 'fixed');
  const contractHouseholds = new Set(confirmedContracts.map(c => c.householdId)).size;
  const contractCount = confirmedContracts.length;

  // 転換率
  const lpRate = safeDiv(lifeplans * 100, meetings);
  const proposalRate = safeDiv(proposals * 100, meetings);
  const contractRate = safeDiv(contractHouseholds * 100, proposals);
  const avgHouseholdValue = safeDiv(
    confirmedContracts.reduce((s, c) => s + (c.firstYearCommission ?? 0), 0),
    contractHouseholds,
  );

  return {
    meetings, lifeplans, proposals, policyCollections,
    contracts: contractHouseholds, contractCount,
    lpRate, proposalRate, contractRate, avgHouseholdValue,
  };
}

/**
 * 担当者比較ヒートテーブル用データ
 */
export interface OwnerFunnelRow {
  ownerId: string;
  ownerName: string;
  meetings: number;
  lifeplans: number;
  proposals: number;
  contracts: number;
  lpRate: number | null;
  contractRate: number | null;
}

export function ownerFunnelHeat(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): OwnerFunnelRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  return scopeIds.map(uid => {
    const oc = filtered.filter(c => c.ownerId === uid);
    const meetings = oc.filter(c => c.hadMeeting).length;
    const lifeplans = oc.filter(c => c.hadLifeplan).length;
    const proposals = oc.filter(c => c.hadProposal).length;
    const contractHouseholds = new Set(
      oc.filter(c => c.confidenceCode === 'fixed').map(c => c.householdId),
    ).size;
    return {
      ownerId: uid,
      ownerName: ownerName(uid, masters),
      meetings, lifeplans, proposals,
      contracts: contractHouseholds,
      lpRate: safeDiv(lifeplans * 100, meetings),
      contractRate: safeDiv(contractHouseholds * 100, proposals),
    };
  });
}

// ----------------------------------------
// S4: チャネル分析
// ----------------------------------------

export interface ChannelRow {
  channel: string;
  count: number;
  commission: number;
  share: number | null;
}

export function channelBreakdown(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): ChannelRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds)
    .filter(c => isInScenario(c, filter.confidenceScenario));

  const map = new Map<string, { count: number; commission: number }>();
  for (const c of filtered) {
    const existing = map.get(c.channel) ?? { count: 0, commission: 0 };
    map.set(c.channel, {
      count: existing.count + 1,
      commission: existing.commission + validCommission(c),
    });
  }

  const totalCommission = [...map.values()].reduce((s, v) => s + v.commission, 0);
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      count: v.count,
      commission: v.commission,
      share: safeDiv(v.commission * 100, totalCommission),
    }))
    .sort((a, b) => b.commission - a.commission);
}

// ----------------------------------------
// S4追加: 提携先別月次件数テーブル
// ----------------------------------------

export interface PartnerMonthlyRow {
  partner: string;
  /** 会計月(1-12)→件数 */
  monthly: Record<number, number>;
  total: number;
  /** 全体合計に対する構成比 (null=分母0) */
  share: number | null;
}

/**
 * 提携先(partner)別 × 月次 件数テーブル用データ。
 * 分母0 → share=null。
 */
export function partnerMonthlyBreakdown(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): PartnerMonthlyRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds)
    .filter(c => isInScenario(c, filter.confidenceScenario));

  // partner → month → count
  const map = new Map<string, Record<number, number>>();
  for (const c of filtered) {
    if (!map.has(c.partner)) map.set(c.partner, {});
    const rec = map.get(c.partner)!;
    const m = c.month ?? 0; // month null は 0 bucket (未計上)
    rec[m] = (rec[m] ?? 0) + 1;
  }

  const totalCount = filtered.length;
  return [...map.entries()]
    .map(([partner, monthly]) => {
      const total = Object.values(monthly).reduce((s, v) => s + v, 0);
      return {
        partner,
        monthly,
        total,
        share: safeDiv(total * 100, totalCount),
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ----------------------------------------
// S5: 保険会社・種目
// ----------------------------------------

/** 単軸集計行 (保険会社単体 or 種目単体) */
export interface InsurerTypeRow {
  key: string;
  commission: number;
  count: number;
}

/**
 * 保険会社×種目 クロス集計行
 * insurers: 保険会社別の小計行 (productTypes の合計)
 * productTypes: 保険会社内の種目別明細
 */
export interface InsurerTypeCrossRow {
  insurer: string;                          // 保険会社名
  commission: number;                        // 保険会社合計手数料
  count: number;                             // 保険会社合計件数
  productTypes: InsurerTypeRow[];            // 種目別内訳
}

/**
 * S5専用: 保険会社×種目 クロス集計。
 * mode='commission' → 手数料合計で表示・ソート
 * mode='count'      → 件数で表示・ソート
 * フィルタ(confidenceScenario含む)適用後。分母0→null（呼び出し側で "−"）
 */
export function insurerTypeBreakdown(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
  mode: 'commission' | 'count' = 'commission',
): InsurerTypeCrossRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds)
    .filter(c => isInScenario(c, filter.confidenceScenario));

  // 保険会社 → 種目 → { commission, count } の2段 Map
  const crossMap = new Map<string, Map<string, { commission: number; count: number }>>();

  for (const c of filtered) {
    const ins = c.insurer || '未分類';
    const pt  = c.productType || '未分類';

    if (!crossMap.has(ins)) {
      crossMap.set(ins, new Map());
    }
    const ptMap = crossMap.get(ins)!;
    const existing = ptMap.get(pt) ?? { commission: 0, count: 0 };
    ptMap.set(pt, {
      commission: existing.commission + validCommission(c),
      count: existing.count + 1,
    });
  }

  const rows: InsurerTypeCrossRow[] = [];

  for (const [insurer, ptMap] of crossMap.entries()) {
    // 種目別小計
    const productTypes: InsurerTypeRow[] = [...ptMap.entries()]
      .map(([key, v]) => ({ key, commission: v.commission, count: v.count }))
      .sort((a, b) =>
        mode === 'commission'
          ? b.commission - a.commission
          : b.count - a.count,
      );

    // 保険会社合計
    const totalCommission = productTypes.reduce((s, r) => s + r.commission, 0);
    const totalCount      = productTypes.reduce((s, r) => s + r.count, 0);

    rows.push({
      insurer,
      commission: totalCommission,
      count: totalCount,
      productTypes,
    });
  }

  // 保険会社行を mode に応じてソート
  rows.sort((a, b) =>
    mode === 'commission'
      ? b.commission - a.commission
      : b.count - a.count,
  );

  return rows;
}

// ----------------------------------------
// S6: ライフプラン実績
// ----------------------------------------

export interface LifePlanRow {
  channel: string;
  month: number;
  label: string;
  actual: number;
  target: number;
}

export function lifePlanMetrics(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
  lpTargetPerMonth: number,
): LifePlanRow[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, { ...filter, line: 'life' }, scopeIds);
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const channelSet = new Set(filtered.map(c => c.channel));
  const rows: LifePlanRow[] = [];

  for (const channel of channelSet) {
    for (const m of months) {
      const actual = filtered.filter(c => c.channel === channel && c.month === m && c.hadLifeplan).length;
      rows.push({
        channel,
        month: m,
        label: FISCAL_MONTH_LABELS[m],
        actual,
        target: lpTargetPerMonth,
      });
    }
  }
  return rows;
}

// ----------------------------------------
// S7: 契約明細
// ----------------------------------------

export function contractRows(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): SalesContract[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  return applyFilter(contracts, filter, scopeIds);
}

// ----------------------------------------
// データ品質
// ----------------------------------------

export function dataQuality(
  contracts: SalesContract[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): DataQuality {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);
  return {
    total: filtered.length,
    needsReview: filtered.filter(c => c._issues.length > 0).length,
  };
}

// ----------------------------------------
// 累計コンボ (S2)
// ----------------------------------------

/**
 * S2専用: 累計予算 vs 確定累計 + 月次差額バーデータ
 * - cumBudget: 月次予算の累計 (予算積上げ)
 * - cumActual: 確定累計 (confidenceScenario 適用)
 * - gap: 月次実績 − 月次予算 (マイナス=未達)
 */
export interface CumulativeComboPoint {
  month: number;         // 会計月 1-12
  label: string;         // '4月' 等
  calMonth: string;      // 'YYYY-MM'
  monthlyActual: number;  // 月次実績
  monthlyBudget: number;  // 月次予算
  cumActual: number;      // 確定累計
  cumBudget: number;      // 予算積上げ累計
  gap: number;            // 月次差額 (実績 − 予算)
  cumGap: number;         // 累計差額 (実績累計 − 予算累計)
}

export function cumulativeBudgetVsActual(
  contracts: SalesContract[],
  targets: SalesTargetRow[],
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
): CumulativeComboPoint[] {
  const scopeIds = getScopeUserIds(role, currentUserId, filter, masters);
  const filtered = applyFilter(contracts, filter, scopeIds);

  let cumActual = 0;
  let cumBudget = 0;

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
    // 月次実績: confidenceScenario 適用
    const monthContracts = filtered.filter(
      c => c.month === m && isInScenario(c, filter.confidenceScenario),
    );
    const monthlyActual = monthContracts.reduce((s, c) => s + validCommission(c), 0);

    // 月次予算
    const monthlyBudget = sumTargets(
      targets,
      { ...filter, periodMode: 'single', singleMonth: m },
      'all',
      'ALL',
      [m],
    );

    cumActual += monthlyActual;
    cumBudget += monthlyBudget;

    const { year: cy, month: cm } = fiscalMonthToCalMonth(m, filter.fiscalYear);

    return {
      month: m,
      label: FISCAL_MONTH_LABELS[m],
      calMonth: `${cy}-${String(cm).padStart(2, '0')}`,
      monthlyActual,
      monthlyBudget,
      cumActual,
      cumBudget,
      gap: monthlyActual - monthlyBudget,
      cumGap: cumActual - cumBudget,
    };
  });
}
